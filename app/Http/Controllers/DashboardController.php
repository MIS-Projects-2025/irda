<?php

namespace App\Http\Controllers;

use App\Constants\IrConstants;
use App\Models\IrAdmin;
use App\Services\HrisApiService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Carbon\Carbon;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        return Inertia::render('Dashboard', [
            'stats' => fn () => $this->stats(),
        ]);
    }

    /**
     * Resolve what records the logged-in user should see.
     *
     * Returns:
     *   scope   — 'all' | 'staff' | 'own'
     *   empIds  — array of emp_no values to filter by (empty means no filter / use empId)
     *   empId   — the logged-in employee's ID
     */
    private function resolveScope(): array
    {
        $empId     = (int) session('emp_data.emp_id');
        $adminRole = IrAdmin::roleFor($empId);

        if ($adminRole) {
            return ['scope' => 'all', 'empIds' => [], 'empId' => $empId];
        }

        $directReports = Cache::remember("direct_reports_{$empId}", 600, fn () =>
            app(HrisApiService::class)->fetchDirectReports($empId)
        );

        if (!empty($directReports)) {
            return [
                'scope'  => 'staff',
                'empIds' => array_column($directReports, 'emp_id'),
                'empId'  => $empId,
            ];
        }

        return ['scope' => 'own', 'empIds' => [$empId], 'empId' => $empId];
    }

    /**
     * Apply the resolved scope to an ir_requests query.
     */
    private function scopeIrRequests(string $scope, array $empIds, int $empId)
    {
        $q = DB::table('ir_requests');

        if ($scope === 'own' || $scope === 'staff') {
            $q->whereIn('emp_no', $empIds);
        }
        // 'all' — no filter

        return $q;
    }

    private function stats(): array
    {
        ['scope' => $scope, 'empIds' => $empIds, 'empId' => $empId] = $this->resolveScope();

        // ── Status counts ────────────────────────────────────────────────────────
        $statusCounts = $this->scopeIrRequests($scope, $empIds, $empId)
            ->select('ir_status', DB::raw('COUNT(*) as count'))
            ->groupBy('ir_status')
            ->pluck('count', 'ir_status')
            ->toArray();

        $pending    = (int) ($statusCounts[IrConstants::IR_PENDING]   ?? 0);
        $inProgress = (int) ($statusCounts[IrConstants::IR_VALIDATED] ?? 0);
        $approved   = (int) ($statusCounts[IrConstants::IR_APPROVED]  ?? 0);
        $invalid    = (int) ($statusCounts[IrConstants::IR_INVALID]   ?? 0);
        $cancelled  = (int) ($statusCounts[IrConstants::IR_CANCELLED] ?? 0);
        $total      = $pending + $inProgress + $approved + $invalid + $cancelled;

        // IRs that have a fully acknowledged DA
        $acknowledged = $this->scopeIrRequests($scope, $empIds, $empId)
            ->join('ir_da_requests', 'ir_requests.ir_no', '=', 'ir_da_requests.ir_no')
            ->where('ir_da_requests.da_status', IrConstants::DA_ACKNOWLEDGED)
            ->count();

        // ── Monthly trend — last 12 months ───────────────────────────────────────
        $monthlyRaw = $this->scopeIrRequests($scope, $empIds, $empId)
            ->select(
                DB::raw('DATE_FORMAT(date_created, "%Y-%m") as month'),
                DB::raw('COUNT(*) as count')
            )
            ->where('date_created', '>=', Carbon::now()->subMonths(11)->startOfMonth())
            ->groupBy('month')
            ->orderBy('month')
            ->pluck('count', 'month')
            ->toArray();

        // Fill in every month in the range (so gaps show as 0)
        $monthly = [];
        for ($i = 11; $i >= 0; $i--) {
            $key = Carbon::now()->subMonths($i)->format('Y-m');
            $monthly[] = [
                'month' => Carbon::now()->subMonths($i)->format('M Y'),
                'count' => (int) ($monthlyRaw[$key] ?? 0),
            ];
        }

        // ── Top 10 violation codes ────────────────────────────────────────────────
        $topViolations = DB::table('ir_list')
            ->join('ir_requests', 'ir_list.ir_no', '=', 'ir_requests.ir_no')
            ->select('ir_list.code_no', DB::raw('COUNT(*) as count'))
            ->whereNotNull('ir_list.code_no')
            ->where('ir_list.code_no', '!=', '')
            ->when($scope !== 'all', function ($q) use ($scope, $empIds) {
                $q->whereIn('ir_requests.emp_no', $empIds);
            })
            ->groupBy('ir_list.code_no')
            ->orderByDesc('count')
            ->limit(10)
            ->get()
            ->map(function ($row) {
                $name = DB::table('ir_code_no')
                    ->where('code_number', $row->code_no)
                    ->value('violation');
                return [
                    'code'      => $row->code_no,
                    'violation' => $name ? (strlen($name) > 40 ? substr($name, 0, 40) . '…' : $name) : $row->code_no,
                    'count'     => (int) $row->count,
                ];
            })
            ->toArray();

        // ── DA type distribution ─────────────────────────────────────────────────
        $daTypeRaw = DB::table('ir_list')
            ->join('ir_requests', 'ir_list.ir_no', '=', 'ir_requests.ir_no')
            ->select('ir_list.da_type', DB::raw('COUNT(*) as count'))
            ->whereNotNull('ir_list.da_type')
            ->where('ir_list.da_type', '>', 0)
            ->when($scope !== 'all', function ($q) use ($scope, $empIds) {
                $q->whereIn('ir_requests.emp_no', $empIds);
            })
            ->groupBy('ir_list.da_type')
            ->pluck('count', 'ir_list.da_type')
            ->toArray();

        $daTypes = collect(IrConstants::DA_TYPES)
            ->map(fn ($label, $key) => [
                'label' => $label,
                'count' => (int) ($daTypeRaw[$key] ?? 0),
            ])
            ->values()
            ->toArray();

        // ── Violation type split ─────────────────────────────────────────────────
        $adminCount = $this->scopeIrRequests($scope, $empIds, $empId)
            ->where('quality_violation', IrConstants::VIOLATION_ADMINISTRATIVE)
            ->count();

        $qualityCount = $this->scopeIrRequests($scope, $empIds, $empId)
            ->where('quality_violation', IrConstants::VIOLATION_QUALITY)
            ->count();

        return [
            'scope'        => $scope,
            'total'        => $total,
            'pending'      => $pending,
            'inProgress'   => $inProgress,
            'approved'     => $approved,
            'invalid'      => $invalid,
            'cancelled'    => $cancelled,
            'acknowledged' => $acknowledged,
            'monthly'      => $monthly,
            'topViolations'=> $topViolations,
            'daTypes'      => $daTypes,
            'violationType'=> [
                ['label' => 'Administrative', 'count' => $adminCount],
                ['label' => 'Quality',        'count' => $qualityCount],
            ],
        ];
    }
}
