<p align="center"><picture><source media="(prefers-color-scheme: dark)" srcset="assets/mark/orbe-lockup-paper.svg"><img src="assets/mark/orbe-lockup-ink.svg" alt="The Orbe lockup: the Portal, a block with one corner cut flat, a round counter and a channel rising through it, beside the Carved wordmark Orbe" width="240"></picture></p>

<p align="center"><b>Creator tooling.</b> Your work, rated against creators your size. Free for creators, for good.</p>

<p align="center"><a href="https://eoinforker.github.io/orbe-site/">eoinforker.github.io/orbe-site</a></p>

## What this repository is

This is the **generated** GitHub Pages output of Orbe's public website. **Never edit it by hand.** Every file here except this README (and, once it exists, `CNAME`) is overwritten on the next publish, so a change made here is lost.

The source is Orbe's main repository, in `site/`. Every tool on the site runs in your browser on Orbe's own engine, and nothing you type or upload leaves your device. Every creator, show, brand and figure on the site is made up and labelled as such.

## The site, by pillar

- **Grow:** [Your Orbe](https://eoinforker.github.io/orbe-site/products/you/), [Rate my work](https://eoinforker.github.io/orbe-site/products/rate/), [Podcasts](https://eoinforker.github.io/orbe-site/products/podcasts/)
- **Earn:** [Sponsorships](https://eoinforker.github.io/orbe-site/products/sponsorships/), [Fair offer check](https://eoinforker.github.io/orbe-site/products/offer/), [Selling](https://eoinforker.github.io/orbe-site/products/selling/), [Diligence](https://eoinforker.github.io/orbe-site/products/diligence/)
- **Protect:** [Protect](https://eoinforker.github.io/orbe-site/products/protect/), [Rights](https://eoinforker.github.io/orbe-site/products/rights/)
- **Teams:** [Roster](https://eoinforker.github.io/orbe-site/products/roster/), [For teams](https://eoinforker.github.io/orbe-site/teams/), [For developers](https://eoinforker.github.io/orbe-site/developers/)

Also: [all products](https://eoinforker.github.io/orbe-site/products/), [pricing](https://eoinforker.github.io/orbe-site/pricing/), the [brand book](https://eoinforker.github.io/orbe-site/brand/) and the draft [terms](https://eoinforker.github.io/orbe-site/legal/terms.html) and [privacy](https://eoinforker.github.io/orbe-site/legal/privacy.html).

## How to publish

From a checkout of the main repository, with this repository cloned beside it:

```
bash scripts/publish-site.sh ~/orbe-site      # ~/orbe-site is the default destination
cd ~/orbe-site
git add -A
git commit -m "Publish: <what changed>"
git push
```

`scripts/publish-site.sh` empties this checkout except `.git`, `README.md`, `CNAME` and `.nojekyll`, then copies in only the paths on its `PUBLIC` list: the homepage files, `404.html`, `llms.txt`, `pricing/`, `teams/`, `developers/`, `products/`, `brand/`, `legal/` and the assets they use, without any `shots` folder. It writes `.nojekyll` so GitHub Pages serves the files as they are, without Jekyll. To publish a new page, add it to `PUBLIC` in the main repository. Run the checks there (`node scripts/check-site.mjs site`) before publishing.

## The custom domain

The site is served at `eoinforker.github.io/orbe-site` for now. The plan is a custom domain (`orbe.vc` is the working choice, still to be confirmed). Once its DNS resolves to GitHub Pages:

1. Add a `CNAME` file at the root of this repository holding the bare domain, and set the same domain under Settings, Pages, Custom domain.
2. Turn on Enforce HTTPS once GitHub has issued the certificate.
3. Update the links in this README and in the main repository's README.

`publish-site.sh` keeps `CNAME` when it publishes, so it only has to be added once.
