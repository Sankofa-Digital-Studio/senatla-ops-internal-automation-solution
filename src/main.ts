import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { provideBackendGateways } from './app/core/gateways/backend.providers';
import { loadRuntimeConfig, provideRuntimeConfig } from './app/core/config/runtime-config';

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
}

void main().catch((err) => console.error(err));
