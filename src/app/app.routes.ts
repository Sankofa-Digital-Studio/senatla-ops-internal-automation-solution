import { Routes } from '@angular/router';
import { adminWorkspaceCanActivate, adminWorkspaceCanMatch, roleCanActivate, roleCanMatch } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'landing',
    pathMatch: 'full',
  },
  {
    path: 'landing',
    loadComponent: () => import('./pages/landing/landing.component').then((m) => m.LandingComponent),
  },
  {
    path: 'register',
    redirectTo: 'login',
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'login/recovery',
    loadComponent: () => import('./pages/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'login/:role',
    loadComponent: () => import('./pages/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'site-manager',
    canMatch: [roleCanMatch('site')],
    canActivate: [roleCanActivate('site')],
    loadComponent: () => import('./pages/site-manager/site-manager.component').then((m) => m.SiteManagerComponent),
  },
  {
    path: 'office-admin',
    canMatch: [adminWorkspaceCanMatch()],
    canActivate: [adminWorkspaceCanActivate()],
    loadComponent: () => import('./pages/office-admin/office-admin.component').then((m) => m.OfficeAdminComponent),
  },
  {
    path: 'director',
    canMatch: [roleCanMatch('director')],
    canActivate: [roleCanActivate('director')],
    loadComponent: () => import('./pages/director/director.component').then((m) => m.DirectorComponent),
  },
  {
    path: 'asset-register',
    canMatch: [roleCanMatch(['site', 'office', 'director'], 'office')],
    canActivate: [roleCanActivate(['site', 'office', 'director'], 'office')],
    loadComponent: () => import('./pages/asset-register/asset-register.component').then((m) => m.AssetRegisterComponent),
  },
  {
    path: 'costing-model',
    canMatch: [roleCanMatch(['site', 'office', 'director'], 'director')],
    canActivate: [roleCanActivate(['site', 'office', 'director'], 'director')],
    loadComponent: () => import('./pages/costing-model/costing-model.component').then((m) => m.CostingModelComponent),
  },
  {
    path: 'profile-settings',
    canMatch: [roleCanMatch()],
    canActivate: [roleCanActivate()],
    loadComponent: () => import('./pages/profile-settings/profile-settings.component').then((m) => m.ProfileSettingsComponent),
  },
  {
    path: '**',
    redirectTo: 'landing',
  },
];
