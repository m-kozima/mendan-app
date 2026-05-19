# NETLIFY_DEPLOYMENT.md — Netlify デプロイ運用ルール

このファイルは Netlify をホスティングに使用するプロジェクトで遵守すべきデプロイ運用ルールを定める。Netlify を使わないプロジェクト（Kagoya 等）では本ファイルを配置しなくてよい。

CLAUDE.md および CLAUDE_security_baseline.md と併せて読み込み、両方を遵守すること。

---

## 0. このファイルの存在理由

複数プロジェクトを並行開発している環境では、**「間違ったプロジェクトにデプロイする」事故が頻発する**。実際に過去にも複数回発生している。

具体的な事故パターン：
- プロジェクトA を開発中に、プロジェクトB の Netlify サイトに上書きデプロイ
- 既存サイトを使うべき場面で、Claude Code が新規サイトを勝手に作成
- プレビューデプロイのつもりが本番デプロイ（`--prod` 誤指定）
- `.netlify/state.json` が壊れて想定外のサイトに送信
- 複数ターミナルを開いている時、どのプロジェクトのターミナルか取り違える

これらは Claude Code の permissions だけでは防げない（コマンド自体は正当で、宛先の正誤は Claude Code には判定不能）。**人間と Claude Code の両方が確実に守る運用ルール**として本ファイルを定める。

---

## 1. 大原則

### 1.1 新規サイトを絶対に作成しない
本グループの稼働中アプリは全て既存の Netlify サイトを持つ。**新規サイト作成を Claude Code に依頼しない。** Claude Code 側でも、明示的な指示なしに新規サイトを作成してはならない。

新規プロジェクトで本当に新規サイトが必要な場合は、Netlify ダッシュボード上で手動作成し、Site ID を CLAUDE.md に記載してから Claude Code に作業を依頼する。Claude Code にコマンドラインから新規サイトを作成させない。

### 1.2 Site ID を必ず明示する
全てのデプロイコマンドで `--site [Site ID]` を必須とする：

```bash
netlify deploy --site [Site ID]                # プレビュー
netlify deploy --prod --site [Site ID]          # 本番
```

`--site` を省略してはならない。省略すると `.netlify/state.json` の値が使われ、これが壊れていると別サイトに送信される。

### 1.3 プロジェクト = 1ディレクトリ = 1 CLAUDE.md = 1 Netlify サイト
1つのディレクトリに複数プロジェクトの情報を混在させない。プロジェクトをまたいで作業しない。

```
正しい構成：
/recruit-app/        ← CLAUDE.md に recruit-app の Site ID のみ
/strategy-app/       ← CLAUDE.md に strategy-app の Site ID のみ
/article-tool/       ← CLAUDE.md に article-tool の Site ID のみ
```

### 1.4 VSCode のターミナルから Claude Code を起動すること
Claude Code は **必ず VSCode のターミナル（Terminal → New Terminal）から `claude` コマンドで起動する**。Windows Terminal や PowerShell 単独使用は禁止。

理由：
- VSCode が開いているフォルダと Claude Code の作業ディレクトリが自動で揃う
- 別プロジェクトのターミナルに紛れ込んで誤デプロイする事故を防ぐ
- 第0条で挙げた「複数ターミナル開いてどのプロジェクトか取り違える」事故の主要原因

VSCode 外でターミナルを開いた状態で Claude Code を起動した場合、Claude Code は現在のディレクトリを基準に動作するため、想定外のサイトにデプロイする事故につながる。

---

## 2. プロジェクト固有のデプロイ情報（CLAUDE.md に記載すべき内容）

各プロジェクトの CLAUDE.md には、以下の情報を必ず記載する：

```markdown
## Netlify デプロイ設定（必ず守ること）

- サイト名: 【サイト名】
- URL: 【URL】
- Site ID: 【Site ID】
- 本番ブランチ: main
- ビルドコマンド: 【npm run build 等】
- 公開ディレクトリ: 【dist 等】

⚠️ 新規サイトを作成しないこと。必ず上記の既存サイトにデプロイすること。
⚠️ デプロイコマンドは必ず `--site [Site ID]` を明示すること。
```

---

## 3. 環境変数の運用

### 3.1 環境変数の管理場所
- **本番値・実トークン**：Netlify ダッシュボード → Site configuration → Environment variables
- **ローカル `.env`**：開発用ダミー値のみ（本番値は絶対に置かない）

### 3.2 Netlify の環境変数スコープ
Netlify には3種類のスコープがある。混同しないよう注意：

| スコープ | 用途 |
|---------|------|
| Production | 本番環境（main ブランチからのデプロイ） |
| Deploy Previews | プルリクエストのプレビュー |
| Branch Deploys | main 以外のブランチからのデプロイ |

機密度の高い値は Production のみに設定し、Deploy Preview には別の値（テスト用）を設定するのが安全。

### 3.3 環境変数操作のルール
- `netlify env:set` は ask（実行前に必ず確認）
- `netlify env:unset` は deny（誤削除防止）
- `netlify env:list` は allow（値はマスクされる）

---

## 4. デプロイのワークフロー

### 4.1 通常の開発フロー（推奨）

```
ローカルで開発・動作確認
    ↓
git commit & push（main 以外のブランチ推奨）
    ↓
Netlify が自動でデプロイプレビュー生成
    ↓
プレビュー URL で動作確認
    ↓
問題なければ main にマージ
    ↓
Netlify が自動で本番デプロイ
```

このフローなら手動の `netlify deploy` を実行する機会がほぼなく、誤デプロイのリスクが最小化される。

### 4.2 手動デプロイが必要な場合
GitHub 連携なしで急ぎの修正をデプロイする等の例外時：

**プレビュー（推奨）**：
```bash
netlify deploy --site [Site ID]
```

**本番**：
```bash
netlify deploy --prod --site [Site ID]
```

`--prod` は本番反映を意味する。プレビューで十分なら絶対に付けない。

---

## 5. デプロイ前チェックリスト

Claude Code にデプロイを依頼する前、または手動でデプロイする前に必ず確認：

- [ ] **正しいプロジェクトフォルダで作業しているか**（`pwd` で現在位置を確認）
- [ ] **そのフォルダに CLAUDE.md があるか**
- [ ] **CLAUDE.md に Site ID が記載されているか**
- [ ] **`netlify status` でリンク先サイト名が CLAUDE.md と一致しているか**
- [ ] **デプロイコマンドが `--site [Site ID]` を含んでいるか**
- [ ] **本番デプロイ（`--prod`）の場合、本当に本番反映してよいか再確認**
- [ ] **環境変数が Netlify ダッシュボードに正しく設定されているか**

---

## 6. デプロイ後の動作確認

デプロイ完了後、本番 URL を実際にブラウザで開いて以下を確認：

- [ ] 想定通りのコンテンツが表示されているか
- [ ] 主要機能（ログイン、API 連携、データ表示等）が動作するか
- [ ] コンソールにエラーが出ていないか
- [ ] 環境変数が正しく読み込まれているか

異常があった場合、即座にロールバック（次条参照）。

---

## 7. ロールバック手順

デプロイ後に問題が発覚した場合、以下の手順で前のバージョンに戻す：

### 7.1 Netlify ダッシュボードから（推奨）
1. Netlify ダッシュボード → 対象サイト → Deploys
2. 過去の正常デプロイを選択
3. **Publish deploy** をクリック

これだけで即座に前のバージョンに戻る。コードを書き直す必要はない。

### 7.2 git revert で戻す
GitHub 連携している場合、`git revert` して push すれば自動で再デプロイされる。

```bash
git revert HEAD
git push
```

---

## 8. Site ID の確認方法

### 方法1: Netlify CLI
```bash
netlify sites:list
```
全サイトの一覧が Site ID 付きで表示される。

### 方法2: Netlify ダッシュボード
対象サイト → Site configuration → General → Site information → API ID

---

## 9. Claude Code への基本指示（毎セッション開始時）

新しいセッションで Claude Code に作業を依頼する際、以下を伝える（または CLAUDE.md に記載済みであることを確認させる）：

```
このプロジェクトには既存の Netlify サイトがあります。
新規サイトを絶対に作成しないでください。
デプロイ前に必ず netlify status でリンク先サイト名を確認してください。
デプロイコマンドは必ず --site [Site ID] を明示してください。
本番デプロイ（--prod）は事前に必ず確認してください。
```

---

## 10. よくある事故パターンと対策

### 10.1 「既存サイトを上書きしてしまった」
**原因**：Claude Code が `.netlify/state.json` を読み違え、別プロジェクトのサイトに送信  
**対策**：`--site [Site ID]` を必ず明示。CLAUDE.md にも記載

### 10.2 「新規サイトが勝手に作られた」
**原因**：`netlify deploy` で Site ID 未指定だった場合、対話モードで新規作成を選択してしまう  
**対策**：CLAUDE.md に「新規サイト作成禁止」を明記。Claude Code はこれを守る

### 10.3 「プレビューのつもりが本番に反映された」
**原因**：`--prod` フラグの誤指定  
**対策**：手動デプロイ時は `--prod` を付けるかどうかを必ず確認。GitHub 連携経由のフローを優先

### 10.4 「ローカルでは動くのに本番で動かない」
**原因**：環境変数が Netlify ダッシュボードに設定されていない、またはスコープが違う  
**対策**：`netlify env:list` で現状確認。Production / Deploy Preview のスコープを確認

### 10.5 「ビルドが失敗する」
**原因**：Node.js バージョン不一致、ビルドイメージが古い等  
**対策**：`netlify.toml` に Node バージョンを明記。Netlify ダッシュボードで Build image を最新に

---

## 11. 改訂履歴

| 日付 | 改訂内容 |
|------|---------|
| 2026-04-30 | 初版作成 |
