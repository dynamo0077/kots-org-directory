import { Routes } from '@angular/router';
import { Directory } from './features/directory/directory';

export const routes: Routes = [
  { path: '', component: Directory },
  { path: '**', redirectTo: '' },
];
