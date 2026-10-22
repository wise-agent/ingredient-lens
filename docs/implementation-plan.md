# 實作計畫
1. 保留唯一 Sites project ID，使用官方 Vinext starter；宣告 DB 綁定。
2. 整理真實部分資料及來源 metadata，建立 schema-only migrations、外部 seed 匯入及 idempotent 批次紀錄。
3. 寫參數化伺服器篩選查詢、分類遞迴與動態 facet counts；前台只展示實際 API 結果。
4. 並行建置已核可的繁中手機／桌面介面；串接包含／排除、搜尋建議、詳情。
5. 測試篩選及資料完整度、執行型別檢查和 build，必要時修正；在可用的瀏覽器做可執行QA，明確揭露限制。
6. 將精確來源推送與封裝；私人部署；匯入種子資料；驗證正式D1資料表、筆數及發布狀態後交付。
