import nodemailer from 'nodemailer';
import { Resend } from 'resend';

// Email configuration - 支持两种模式：SMTP 和 Resend API
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.aliyun.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '465');
const SMTP_SECURE = process.env.SMTP_SECURE === 'true' || SMTP_PORT === 465;
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@migeai.com';
const EMAIL_FROM_NAME = process.env.EMAIL_FROM_NAME || 'Mige AI';

// Resend API 配置 (可选的替代方案)
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || EMAIL_FROM;

// 使用 Resend API (推荐)
const USE_RESEND = Boolean(RESEND_API_KEY);

// Initialize Resend client
const resend = USE_RESEND ? new Resend(RESEND_API_KEY) : null;

// Check if email is configured
export function isEmailConfigured(): boolean {
  return USE_RESEND || Boolean(SMTP_USER && SMTP_PASS && SMTP_HOST);
}

// Create SMTP transporter
function createSmtpTransporter() {
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: SMTP_USER && SMTP_PASS ? {
      user: SMTP_USER,
      pass: SMTP_PASS,
    } : undefined,
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 15000,
  });
}

// Send email with error logging
async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  if (!isEmailConfigured()) {
    console.warn('[Email] SMTP not configured. Skipping email send.');
    console.log('[Email] Would have sent:', {
      to: options.to,
      subject: options.subject,
    });
    return false;
  }

  try {
    if (USE_RESEND) {
      // 使用 Resend API
      const { data, error } = await resend!.emails.send({
        from: `"${EMAIL_FROM_NAME}" <${RESEND_FROM_EMAIL}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
      });
      
      if (error) {
        console.error('[Email] Resend error:', error);
        return false;
      }
      
      console.log('[Email] Sent via Resend successfully:', data?.id);
      return true;
    } else {
      // 使用 SMTP
      const transporter = createSmtpTransporter();
      await transporter.sendMail({
        from: `"${EMAIL_FROM_NAME}" <${EMAIL_FROM}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
      });
      console.log('[Email] Sent via SMTP successfully to:', options.to);
      return true;
    }
  } catch (error) {
    console.error('[Email] Failed to send:', error);
    return false;
  }
}

// Send password reset email
export async function sendPasswordResetEmail(
  email: string,
  resetToken: string,
  locale: string = 'zh'
): Promise<boolean> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://migeai.cn';
  const resetUrl = `${baseUrl}/${locale}/reset-password?token=${resetToken}`;
  
  const subjects: Record<string, string> = {
    zh: '米格AI - 重置密码',
    en: 'Mige AI - Reset Password',
    ja: 'Mige AI - パスワードリセット',
    es: 'Mige AI - Restablecer contraseña',
    fr: 'Mige AI - Réinitialiser le mot de passe',
    de: 'Mige AI - Passwort zurücksetzen',
    pt: 'Mige AI - Redefinir senha',
    ru: 'Mige AI - Сброс пароля',
    it: 'Mige AI - Reimposta password',
    ar: 'Mige AI - إعادة تعيين كلمة المرور',
    hi: 'Mige AI - पासवर्ड रीसेट करें',
  };

  const bodies: Record<string, string> = {
    zh: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #fff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
          .btn { display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
          .link { word-break: break-all; color: #667eea; font-size: 14px; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
          .warning { background: #fef3cd; padding: 12px; border-radius: 6px; margin: 15px 0; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 米格AI - 重置密码</h1>
          </div>
          <div class="content">
            <p>您好，</p>
            <p>我们收到了重置您账户密码的请求。如果您没有发起此请求，请忽略此邮件。</p>
            <p>点击下面的按钮重置密码：</p>
            <p style="text-align: center;">
              <a href="${resetUrl}" class="btn">重置密码</a>
            </p>
            <p>或者复制以下链接到浏览器：</p>
            <p class="link">${resetUrl}</p>
            <div class="warning">
              ⚠️ 此链接将在 <strong>1 小时</strong>后过期。为了您的账户安全，请勿将此邮件转发给他人。
            </div>
          </div>
          <div class="footer">
            <p>米格AI 团队</p>
            <p>此邮件由系统自动发送，请勿回复</p>
          </div>
        </div>
      </body>
      </html>
    `,
    en: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #fff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
          .btn { display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
          .link { word-break: break-all; color: #667eea; font-size: 14px; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
          .warning { background: #fef3cd; padding: 12px; border-radius: 6px; margin: 15px 0; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Mige AI - Reset Password</h1>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p>We received a request to reset your account password. If you didn't request this, please ignore this email.</p>
            <p>Click the button below to reset your password:</p>
            <p style="text-align: center;">
              <a href="${resetUrl}" class="btn">Reset Password</a>
            </p>
            <p>Or copy this link to your browser:</p>
            <p class="link">${resetUrl}</p>
            <div class="warning">
              ⚠️ This link will expire in <strong>1 hour</strong>. For your account security, please do not forward this email.
            </div>
          </div>
          <div class="footer">
            <p>Mige AI Team</p>
            <p>This is an automated message, please do not reply</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  return sendEmail({
    to: email,
    subject: subjects[locale] || subjects.zh,
    html: bodies[locale] || bodies.zh,
  });
}

// Send welcome email
export async function sendWelcomeEmail(
  email: string,
  name: string,
  locale: string = 'zh'
): Promise<boolean> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://migeai.cn';
  
  const subjects: Record<string, string> = {
    zh: '🎉 欢迎加入米格AI！',
    en: '🎉 Welcome to Mige AI!',
    ja: '🎉 Mige AIへようこそ！',
    es: '🎉 ¡Bienvenido a Mige AI!',
    fr: '🎉 Bienvenue chez Mige AI!',
    de: '🎉 Willkommen bei Mige AI!',
    pt: '🎉 Bem-vindo ao Mige AI!',
    ru: '🎉 Добро пожаловать в Mige AI!',
    it: '🎉 Benvenuto in Mige AI!',
    ar: '🎉 مرحباً بك في Mige AI!',
    hi: '🎉 Mige AI में आपका स्वागत है!',
  };

  const bodies: Record<string, string> = {
    zh: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .header h1 { margin: 0; font-size: 28px; }
          .content { background: #fff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
          .btn { display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
          .feature-list { list-style: none; padding: 0; }
          .feature-list li { padding: 10px 0; border-bottom: 1px solid #f3f4f6; }
          .feature-list li:last-child { border-bottom: none; }
          .feature-icon { margin-right: 10px; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 欢迎加入米格AI！</h1>
          </div>
          <div class="content">
            <p>亲爱的 <strong>${name}</strong>，</p>
            <p>感谢您注册米格AI！🎊 我们很高兴您能加入我们的平台。</p>
            <p>您现在可以开始使用我们的 AI 语音服务：</p>
            <ul class="feature-list">
              <li><span class="feature-icon">🤖</span> 创建和管理 AI 语音 Agent</li>
              <li><span class="feature-icon">📞</span> 进行 Web Call 和 Phone Call</li>
              <li><span class="feature-icon">💬</span> 查看通话记录和分析</li>
              <li><span class="feature-icon">🔧</span> 自定义语音设置</li>
            </ul>
            <p style="text-align: center;">
              <a href="${baseUrl}/zh" class="btn">开始使用</a>
            </p>
            <p>如有任何问题，请随时联系我们的支持团队。</p>
            <p>祝您使用愉快！</p>
          </div>
          <div class="footer">
            <p><strong>米格AI 团队</strong></p>
            <p>此邮件由系统自动发送，请勿回复</p>
          </div>
        </div>
      </body>
      </html>
    `,
    en: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .header h1 { margin: 0; font-size: 28px; }
          .content { background: #fff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
          .btn { display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
          .feature-list { list-style: none; padding: 0; }
          .feature-list li { padding: 10px 0; border-bottom: 1px solid #f3f4f6; }
          .feature-list li:last-child { border-bottom: none; }
          .feature-icon { margin-right: 10px; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Welcome to Mige AI!</h1>
          </div>
          <div class="content">
            <p>Dear <strong>${name}</strong>,</p>
            <p>Thank you for registering with Mige AI! 🎊 We're thrilled to have you on board.</p>
            <p>You can now start using our AI voice services:</p>
            <ul class="feature-list">
              <li><span class="feature-icon">🤖</span> Create and manage AI voice Agents</li>
              <li><span class="feature-icon">📞</span> Make Web Call and Phone Call</li>
              <li><span class="feature-icon">💬</span> View call records and analytics</li>
              <li><span class="feature-icon">🔧</span> Customize voice settings</li>
            </ul>
            <p style="text-align: center;">
              <a href="${baseUrl}/en" class="btn">Get Started</a>
            </p>
            <p>If you have any questions, feel free to contact our support team.</p>
            <p>Enjoy!</p>
          </div>
          <div class="footer">
            <p><strong>Mige AI Team</strong></p>
            <p>This is an automated message, please do not reply</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  return sendEmail({
    to: email,
    subject: subjects[locale] || subjects.zh,
    html: bodies[locale] || bodies.zh,
  });
}
