# Kraskus Reference App Standard

Mysterium Node is the first reference application.

Every Kraskus custom-store app should:

- use the native 5tratStore recipe layout;
- identify the original upstream project accurately;
- pull runtime artifacts directly from the original publisher;
- pin image version and immutable digest;
- keep persistent state under `${APP_DATA_DIR}`;
- use `app_proxy` for a 5tratumOS-integrated HTTP interface;
- avoid Docker socket, host mounts, devices, host networking, privileges, and
  added Linux capabilities unless the upstream application genuinely requires
  them and the review documents why;
- disclose third-party services, telemetry, network exposure, referrals, and
  account requirements;
- never commit user secrets or runtime state;
- keep new app reviews at `status: proposed` until tested/reviewed;
- pass `scripts/validate_store.py`;
- pass `scripts/validate-compose.sh <app-id>`;
- complete install/start/restart/update/uninstall testing before being marked
  production-ready.

## Reference onboarding pattern

For third-party services with optional account creation:

1. **New user** — clearly disclose and open the supported signup/referral link.
2. **Existing user** — allow the user to bypass signup.
3. User credentials/API keys remain user-supplied and are never embedded in
   the repository.
4. The app's local management page should remain behind 5tratumOS `app_proxy`
   whenever practical.

## Repository pattern

```text
Kraskus-5tratStore/
├── umbrel-app-store.yml
├── README.md
├── REFERENCE-APP-STANDARD.md
├── templates/
│   └── app/
├── scripts/
│   ├── new-app.sh
│   ├── validate_store.py
│   └── validate-compose.sh
└── <app-id>/
    ├── 5tratstore-app.yml
    ├── 5tratstore-review.yml
    ├── LICENSES.md
    ├── docker-compose.yml
    └── data/
```
