# Frontend

Next.js App Router 手機優先 PWA。

## 啟動

```bash
npm install
npm run dev
```

## 目前頁面

- `/`
- `/mobile`
- `/mobile/loan`
- `/mobile/return`
- `/mobile/books`
- `/mobile/books/new`
- `/mobile/books/:id/edit`
- `/mobile/members`
- `/mobile/members/new`
- `/mobile/members/:id/edit`

## API 呼叫

前端目前預設走同源 `/api`，因此：

- 本機開發可透過前端 dev server + Caddy / 同網域代理使用
- 手機內網 HTTPS 可直接呼叫同一個主機上的 `/api`

## 本機開發 log

- [frontend-dev.log](C:\Users\user\Documents\Playground\library-system\frontend\frontend-dev.log)
