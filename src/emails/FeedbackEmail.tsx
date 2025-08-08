import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Hr,
  Row,
  Column,
} from '@react-email/components';
import { FeedbackData, FEEDBACK_TYPE_LABELS, PRIORITY_LABELS } from '@/types/feedback';

interface FeedbackEmailProps {
  feedback: FeedbackData;
}

export default function FeedbackEmail({ feedback }: FeedbackEmailProps) {
  const previewText = `【${FEEDBACK_TYPE_LABELS[feedback.type]}】日報アプリへのフィードバック`;
  
  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          {/* ヘッダー */}
          <Section style={styles.header}>
            <Heading style={styles.title}>
              📝 日報アプリ フィードバック
            </Heading>
          </Section>

          <Hr style={styles.hr} />

          {/* フィードバック基本情報 */}
          <Section style={styles.section}>
            <Heading as="h2" style={styles.sectionTitle}>
              📋 フィードバック内容
            </Heading>
            
            <Row style={styles.infoRow}>
              <Column style={styles.labelColumn}>
                <Text style={styles.label}>種類:</Text>
              </Column>
              <Column>
                <Text style={styles.value}>
                  {FEEDBACK_TYPE_LABELS[feedback.type]}
                </Text>
              </Column>
            </Row>

            {feedback.priority && (
              <Row style={styles.infoRow}>
                <Column style={styles.labelColumn}>
                  <Text style={styles.label}>優先度:</Text>
                </Column>
                <Column>
                  <Text style={styles.value}>
                    {PRIORITY_LABELS[feedback.priority]}
                  </Text>
                </Column>
              </Row>
            )}

            <Row style={styles.infoRow}>
              <Column style={styles.labelColumn}>
                <Text style={styles.label}>送信日時:</Text>
              </Column>
              <Column>
                <Text style={styles.value}>
                  {feedback.timestamp ? new Date(feedback.timestamp).toLocaleString('ja-JP') : '不明'}
                </Text>
              </Column>
            </Row>
          </Section>

          {/* メッセージ本文 */}
          <Section style={styles.section}>
            <Heading as="h2" style={styles.sectionTitle}>
              💬 詳細内容
            </Heading>
            <Text style={styles.message}>
              {feedback.message}
            </Text>
          </Section>

          {/* 連絡先情報 */}
          {feedback.email && (
            <Section style={styles.section}>
              <Heading as="h2" style={styles.sectionTitle}>
                📧 連絡先
              </Heading>
              <Text style={styles.value}>
                {feedback.email}
              </Text>
            </Section>
          )}

          {/* 技術情報 */}
          <Section style={styles.section}>
            <Heading as="h2" style={styles.sectionTitle}>
              🔧 技術情報
            </Heading>
            
            {feedback.url && (
              <Row style={styles.infoRow}>
                <Column style={styles.labelColumn}>
                  <Text style={styles.label}>発生ページ:</Text>
                </Column>
                <Column>
                  <Text style={styles.value}>
                    {feedback.url}
                  </Text>
                </Column>
              </Row>
            )}

            {feedback.userAgent && (
              <Row style={styles.infoRow}>
                <Column style={styles.labelColumn}>
                  <Text style={styles.label}>ブラウザ:</Text>
                </Column>
                <Column>
                  <Text style={styles.techInfo}>
                    {feedback.userAgent}
                  </Text>
                </Column>
              </Row>
            )}

            {feedback.appVersion && (
              <Row style={styles.infoRow}>
                <Column style={styles.labelColumn}>
                  <Text style={styles.label}>アプリバージョン:</Text>
                </Column>
                <Column>
                  <Text style={styles.value}>
                    {feedback.appVersion}
                  </Text>
                </Column>
              </Row>
            )}
          </Section>

          <Hr style={styles.hr} />

          {/* フッター */}
          <Section style={styles.footer}>
            <Text style={styles.footerText}>
              このフィードバックは日報アプリから送信されました。<br />
              改善への貴重なご意見をありがとうございます。
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// スタイル定義
const styles = {
  body: {
    backgroundColor: '#f6f9fc',
    fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
    padding: '20px 0',
  },
  container: {
    backgroundColor: '#ffffff',
    margin: '0 auto',
    padding: '40px 24px',
    borderRadius: '8px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    maxWidth: '600px',
  },
  header: {
    textAlign: 'center' as const,
    marginBottom: '32px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#1f2937',
    margin: '0',
  },
  hr: {
    borderColor: '#e5e7eb',
    margin: '24px 0',
  },
  section: {
    marginBottom: '32px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#374151',
    margin: '0 0 16px 0',
  },
  infoRow: {
    marginBottom: '12px',
  },
  labelColumn: {
    width: '120px',
    verticalAlign: 'top',
  },
  label: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#6b7280',
    margin: '0',
  },
  value: {
    fontSize: '14px',
    color: '#1f2937',
    margin: '0',
  },
  message: {
    fontSize: '16px',
    lineHeight: '1.6',
    color: '#1f2937',
    backgroundColor: '#f9fafb',
    padding: '16px',
    borderRadius: '6px',
    border: '1px solid #e5e7eb',
    margin: '0',
    whiteSpace: 'pre-wrap' as const,
  },
  techInfo: {
    fontSize: '12px',
    color: '#6b7280',
    fontFamily: 'Monaco, "Lucida Console", monospace',
    margin: '0',
    wordBreak: 'break-all' as const,
  },
  footer: {
    textAlign: 'center' as const,
    marginTop: '32px',
  },
  footerText: {
    fontSize: '12px',
    color: '#9ca3af',
    margin: '0',
  },
};
