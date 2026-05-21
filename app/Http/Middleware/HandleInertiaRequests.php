<?php

namespace App\Http\Middleware;

use App\Models\IrAdmin;
use App\Services\HrisApiService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'emp_data'      => fn() => session('emp_data'),
            'ir_admin_role' => fn() => ($empNo = (int) session('emp_data.emp_id'))
                ? IrAdmin::roleFor($empNo)
                : null,
            'has_staff'     => fn() => ($empNo = (int) session('emp_data.emp_id'))
                ? Cache::remember("has_staff_{$empNo}", 600, fn() =>
                    !empty(app(HrisApiService::class)->fetchDirectReports($empNo))
                )
                : false,
            'flash' => [
                'success' => fn() => $request->session()->get('success'),
                'error'   => fn() => $request->session()->get('error'),
            ],
            'auth' => [
                'user' => $request->user(),
            ],
            'appName' => config('app.name'), // This pulls from .env
            'display_name' => env('APP_DISPLAY_NAME', ''),
        ];
    }
}
