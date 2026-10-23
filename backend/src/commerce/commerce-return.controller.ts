import { Controller, Get, Header } from "@nestjs/common";

// Hosted return pages let sandbox onboarding work before the app UI is ready.
// A redirect is informational; only signed webhooks/reconciliation change status.
@Controller("commerce/stripe")
export class CommerceReturnController {
  @Get("return")
  @Header("Content-Type", "text/html; charset=utf-8")
  @Header("Cache-Control", "no-store")
  returned() {
    return '<!doctype html><html lang="ro"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Pinbind — Stripe</title><body><h1>Poți reveni în aplicație</h1><p>Starea verificării și a contului va fi actualizată după confirmarea Stripe. Revenirea pe această pagină nu confirmă finalizarea.</p></body></html>';
  }

  @Get("refresh")
  @Header("Content-Type", "text/html; charset=utf-8")
  @Header("Cache-Control", "no-store")
  refresh() {
    return '<!doctype html><html lang="ro"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Pinbind — Link expirat</title><body><h1>Solicită un link nou</h1><p>Linkul de configurare Stripe a expirat sau a fost folosit. Revino în aplicație și pornește din nou configurarea încasărilor.</p></body></html>';
  }
}
