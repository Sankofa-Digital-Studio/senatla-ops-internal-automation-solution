import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { provideBackendGateways } from './app/core/gateways/backend.providers';
import { loadRuntimeConfig, provideRuntimeConfig } from './app/core/config/runtime-config';

function registerServiceWorker() {
  if (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    window.location.protocol.startsWith('http')
  ) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .catch((err) => console.warn('Senatla Ops SW registration failed:', err));
    });
  }
}

async function main() {
  const config = await loadRuntimeConfig();

  await bootstrapApplication(AppComponent, {
    providers: [
      provideRouter(routes, withInMemoryScrolling({
        anchorScrolling: 'enabled',
        scrollPositionRestoration: 'top',
      })),
      provideRuntimeConfig(config),
      ...provideBackendGateways(config),
    ],
  });

  registerServiceWorker();
}

void main().catch((err) => console.error(err));
