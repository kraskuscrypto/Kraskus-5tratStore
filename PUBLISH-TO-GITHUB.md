# Publish this repository to GitHub

1. Create an empty GitHub repository named `Kraskus-Crypto-Dev-Store`.
2. Do not add a README/license/gitignore in GitHub; this folder already contains them.
3. From the extracted repository directory:

```bash
git init
git add .
git commit -m "Initial Kraskus 5tratStore with Mysterium Node"
git branch -M main
git remote add origin https://github.com/YOUR-GITHUB-USER/Kraskus-Crypto-Dev-Store.git
git push -u origin main
```

Before the first push, run:

```bash
./scripts/pin-images.sh
```

That replaces the image placeholders with immutable upstream Docker digests.

After publishing, use the repository URL in 5tratumOS:

**App Store → Add custom store → GitHub repository URL**
