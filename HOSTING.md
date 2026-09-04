# Как захостить на GitHub

## 1. Создать репозиторий

На github.com → New repository. Без README/license/.gitignore — они
уже есть локально, чтобы не было конфликта при первом пуше. Скопируйте
URL репозитория (вида `https://github.com/<user>/<repo>.git`).

## 2. Подключить и запушить локальный репозиторий

В папке проекта:

```bash
git remote add origin https://github.com/<user>/<repo>.git
git branch -M main
git push -u origin main
```

Дальше просто `git push`, когда появятся новые коммиты.

## 3. Задеплоить сам сайт на GitHub Pages

Проект статический (Vite), бэкенда нет — GitHub Pages отлично подходит.

### Вариант А: через GitHub Actions (автодеплой при каждом пуше)

Создать `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

Затем в репозитории: Settings → Pages → Source → "GitHub Actions".
После пуша в `main` сайт соберётся и опубликуется автоматически.

**Важно:** если репозиторий называется не `<user>.github.io`, сайт
будет жить по пути `https://<user>.github.io/<repo>/` — Vite должен
знать этот базовый путь. В `vite.config.ts` нужно добавить:

```ts
export default defineConfig({
  base: '/<repo>/',
  plugins: [react()],
})
```

(замените `<repo>` на реальное имя репозитория).

### Вариант Б: вручную, без Actions

```bash
npm run build
npx gh-pages -d dist
```

(`gh-pages` — npm-пакет, поставится через `npx` при первом запуске).
В Settings → Pages → Source выбрать ветку `gh-pages`.

## Проверка после первого деплоя

Сайт появится по адресу `https://<user>.github.io/<repo>/` через
1-2 минуты после успешного workflow (смотреть во вкладке Actions
репозитория).
