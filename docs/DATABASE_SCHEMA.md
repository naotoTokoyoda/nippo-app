# データベーススキーマ構成図

## 概要
日報アプリのデータベース構成を視覚的に示したER図です。

## テーブル構成図

```mermaid
erDiagram
    REPORTS {
        string id PK "一意識別子"
        date date "作業日"
        string worker_id FK "作業者ID"
        datetime submitted_at "送信日時"
        datetime created_at "作成日時"
        datetime updated_at "更新日時"
    }
    
    REPORT_ITEMS {
        string id PK "一意識別子"
        string report_id FK "日報ID"
        string customer_id FK "客先ID"
        string work_order_id FK "工番ID"
        string machine_id FK "機械ID"
        datetime start_time "開始時間"
        datetime end_time "終了時間"
        string work_status "勤務状況"
        string work_description "作業内容"
        text remarks "備考"
        datetime created_at "作成日時"
        datetime updated_at "更新日時"
    }
    
    USERS {
        string id PK "一意識別子"
        string name "作業者名"
        datetime created_at "作成日時"
        datetime updated_at "更新日時"
    }
    
    CUSTOMERS {
        string id PK "一意識別子"
        string name "客先名"
        datetime created_at "作成日時"
        datetime updated_at "更新日時"
    }
    
    WORK_ORDERS {
        string id PK "一意識別子"
        string front_number "工番前番"
        string back_number "工番後番"
        string description "工番説明"
        string customer_id FK "客先ID"
        datetime created_at "作成日時"
        datetime updated_at "更新日時"
    }
    
    MACHINES {
        string id PK "一意識別子"
        string category "機械種類"
        datetime created_at "作成日時"
        datetime updated_at "更新日時"
    }

    %% リレーション定義
    REPORTS ||--o{ REPORT_ITEMS : "1つの日報に複数の作業項目"
    USERS ||--o{ REPORTS : "1人の作業者が複数の日報を作成"
    CUSTOMERS ||--o{ REPORT_ITEMS : "1つの客先に複数の作業項目"
    CUSTOMERS ||--o{ WORK_ORDERS : "1つの客先に複数の工番"
    WORK_ORDERS ||--o{ REPORT_ITEMS : "1つの工番に複数の作業項目"
    MACHINES ||--o{ REPORT_ITEMS : "1つの機械で複数の作業項目"
```

## テーブル詳細

### 🗂️ **REPORTS（日報テーブル）**
- **目的**: 日報の基本情報を管理
- **主要フィールド**: 作業日、作業者、送信日時
- **関連**: 1つの日報に複数の作業項目が紐づく

### 📝 **REPORT_ITEMS（日報項目テーブル）**
- **目的**: 各作業項目の詳細情報を管理
- **主要フィールド**: 開始時間、終了時間、作業内容、勤務状況
- **重要**: `work_description`フィールドで各作業項目独立の作業内容を管理

### 👤 **USERS（ユーザーテーブル）**
- **目的**: 作業者情報を管理
- **主要フィールド**: 作業者名

### 🏢 **CUSTOMERS（客先テーブル）**
- **目的**: 客先情報を管理
- **主要フィールド**: 客先名
- **特記**: 背景色の条件分岐に使用（例：クオール市原）

### 🔢 **WORK_ORDERS（工番テーブル）**
- **目的**: 工番情報を管理
- **主要フィールド**: 前番、後番、工番説明
- **関連**: 客先に紐づく

### 🏭 **MACHINES（機械テーブル）**
- **目的**: 機械種類を管理
- **主要フィールド**: 機械種類
- **特記**: 背景色の条件分岐に使用（例：12尺、正面盤、1052）

## 🔗 **主要なリレーション**

1. **REPORTS ↔ REPORT_ITEMS**
   - **関係**: 1対多
   - **説明**: 1つの日報に複数の作業項目

2. **USERS ↔ REPORTS**
   - **関係**: 1対多
   - **説明**: 1人の作業者が複数の日報を作成

3. **CUSTOMERS ↔ REPORT_ITEMS**
   - **関係**: 1対多
   - **説明**: 1つの客先で複数の作業

4. **WORK_ORDERS ↔ REPORT_ITEMS**
   - **関係**: 1対多
   - **説明**: 1つの工番で複数の作業項目

5. **MACHINES ↔ REPORT_ITEMS**
   - **関係**: 1対多
   - **説明**: 1つの機械で複数の作業項目

## 🌟 **重要な改善ポイント**

### **workDescriptionフィールドの追加**
- **改善前**: `WORK_ORDERS.description`に依存（同じ工番 = 同じ作業内容）
- **改善後**: 各`REPORT_ITEMS`が独立した`work_description`を持つ
- **効果**: 同じ工番でも異なる作業内容を正確に管理可能

## 📊 **データフロー**

```
1. 作業者が日報を作成 (REPORTS)
   ↓
2. 複数の作業項目を追加 (REPORT_ITEMS)
   ↓
3. 各作業項目に以下を設定:
   - 客先 (CUSTOMERS)
   - 工番 (WORK_ORDERS)
   - 機械 (MACHINES)
   - 作業内容 (work_description)
   ↓
4. 背景色やフィルタリングで効率的に管理
```

## 🎨 **表示ロジック連携**

このデータベース設計により、以下の表示機能が実現されています：

- **背景色の条件付きフォーマット**
  - 客先名（CUSTOMERS.name）
  - 機械種類（MACHINES.category）

- **勤務状況による時間計算**
  - REPORT_ITEMS.work_status

- **高度なフィルタリング**
  - 全テーブルの情報を組み合わせた検索

---

**作成日**: 2024-08-25  
**更新日**: 2024-08-25  
**バージョン**: 1.0
