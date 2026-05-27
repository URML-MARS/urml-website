/// <reference path="../.astro/types.d.ts" />

declare namespace App {
  interface Locals {
    /** Set by `src/middleware.ts` on successful session-cookie verify.
     *  Undefined on public routes and the admin login/OAuth pages. */
    adminUser?: {
      id: number;
      login: string;
    };
  }
}
