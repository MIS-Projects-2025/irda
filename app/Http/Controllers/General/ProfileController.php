<?php

namespace App\Http\Controllers\General;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class ProfileController extends Controller
{
    public function index()
    {
        $profile = !empty(session('emp_data'))
            ? DB::connection('masterlist')
            ->table('employee_masterlist')
            ->select('EMPLOYID', 'EMPNAME', 'JOB_TITLE', 'DEPARTMENT', 'PRODLINE', 'STATION', 'DATEHIRED', 'EMAIL', 'PASSWRD')
            ->where('EMPLOYID', session('emp_data')['emp_id'])
            ->first()
            : null;

        return Inertia::render('Profile', [
            'profile' => $profile,
        ]);
    }

    public function changePassword(Request $request)
    {
        $credentials = $request->validate([
            'current_password' => 'required',
            'new_password' => 'required|confirmed',
        ], [
            'current_password.required' => 'The current password field is required.',
            'new_password.required' => 'The new password field is required.',
            'new_password.confirmed' => 'The new password and confirmation do not match.',
        ]);

        $empId = session('emp_data')['emp_id'];

        $auth = DB::connection('masterlist')
            ->table('employee_auth')
            ->select('password')
            ->where('employid', $empId)
            ->first();

        if (!$auth || !password_verify($credentials['current_password'], $auth->password)) {
            return back()->withErrors(['current_password' => 'Current password is incorrect.']);
        }

        DB::connection('masterlist')
            ->table('employee_auth')
            ->where('employid', $empId)
            ->update(['password' => password_hash($credentials['new_password'], PASSWORD_BCRYPT)]);

        return back()->with('success', 'Password changed successfully.');
    }
}
