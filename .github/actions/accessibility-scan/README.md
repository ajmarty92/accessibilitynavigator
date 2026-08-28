# Accessibility Navigator Scan (GitHub Action)

Runs a WCAG scan against a URL — typically a PR preview or staging
deployment — and fails the job when the change introduces **new**
violations at or above a configurable severity. It diffs against the most
recent prior scan of the same URL, so a site with pre-existing violations
doesn't fail every PR forever; it only catches regressions.

## Setup

1. In Accessibility Navigator, go to **Settings → API Keys** (requires a
   Professional plan or higher) and generate a key.
2. Add it as a repository secret named `ACCESSIBILITY_NAVIGATOR_API_KEY`
   (Settings → Secrets and variables → Actions).

## Usage

```yaml
name: Accessibility check

on:
  pull_request:

jobs:
  accessibility:
    runs-on: ubuntu-latest
    steps:
      # ... deploy your PR preview and capture its URL as $PREVIEW_URL ...

      - name: Accessibility scan
        uses: ajmarty92/accessibilitynavigator/.github/actions/accessibility-scan@main
        with:
          url: ${{ env.PREVIEW_URL }}
          api-key: ${{ secrets.ACCESSIBILITY_NAVIGATOR_API_KEY }}
          fail-on: critical
```

## Inputs

| Input          | Required | Default                              | Description                                                   |
| -------------- | -------- | ------------------------------------- | --------------------------------------------------------------- |
| `url`          | yes      | —                                      | URL to scan                                                     |
| `api-key`      | yes      | —                                      | API key (use a secret, never a literal value)                   |
| `api-base-url` | no       | `https://accessibility-navigator.com` | Base URL of your Accessibility Navigator deployment              |
| `fail-on`      | no       | `critical`                            | Minimum severity that fails the job: `critical`, `serious`, `moderate`, `any` |
| `max-pages`    | no       | `1`                                    | Number of pages to scan starting from `url`                     |

## Outputs

| Output              | Description                                              |
| -------------------- | --------------------------------------------------------- |
| `passed`             | `"true"` if no new violations at/above `fail-on` were found |
| `report-url`         | Link to the full scan report                               |
| `compliance-score`   | Compliance score (0–100) for this scan                     |

A summary (score, report link, and a list of any new violations) is also
written to the job's step summary.
