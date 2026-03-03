package com.astracine.backend.core.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
public class EmailServiceImpl implements EmailService {

  private final JavaMailSender mailSender;

  @Value("${spring.mail.username}")
  private String fromEmail;

  public EmailServiceImpl(JavaMailSender mailSender) {
    this.mailSender = mailSender;
  }

  @Override
  public void sendPasswordResetEmail(String toEmail, String username, String resetLink) {
    try {
      MimeMessage message = mailSender.createMimeMessage();
      MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

      helper.setFrom(fromEmail);
      helper.setTo(toEmail);
      helper.setSubject("AstraCine - Password Reset Request");

      String html = buildEmailHtml(username, resetLink);
      helper.setText(html, true);

      mailSender.send(message);

    } catch (MessagingException e) {
      throw new RuntimeException("Failed to send password reset email: " + e.getMessage(), e);
    }
  }

  private String buildEmailHtml(String username, String resetLink) {
    // Dùng StringBuilder + replace() — TUYỆT ĐỐI KHÔNG dùng String.format()
    // vì CSS chứa ký tự % gây FormatFlagsConversionMismatchException

    String html = "<!DOCTYPE html>"
        + "<html><head><meta charset='UTF-8'></head>"
        + "<body style='margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,Helvetica,sans-serif;'>"
        + "<table width='100%' cellpadding='0' cellspacing='0' style='background-color:#f4f4f4;padding:40px 0;'>"
        + "<tr><td align='center'>"
        + "<table width='600' cellpadding='0' cellspacing='0' style='background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);'>"

        // Header
        + "<tr><td style='background-color:#e50914;padding:30px 40px;text-align:center;'>"
        + "<h1 style='color:#ffffff;margin:0;font-size:28px;letter-spacing:1px;'>ASTRACINE</h1>"
        + "</td></tr>"

        // Body
        + "<tr><td style='padding:40px;'>"
        + "<p style='font-size:16px;color:#333;margin:0 0 20px;'>Hi <strong>USER_NAME</strong>,</p>"
        + "<p style='font-size:15px;color:#555;line-height:1.6;margin:0 0 20px;'>"
        + "We received a request to reset the password for your account on <strong>AstraCine</strong>. "
        + "If you made this request, please click the link below to reset your password:</p>"

        // Button
        + "<table width='100%' cellpadding='0' cellspacing='0' style='margin:30px 0;'>"
        + "<tr><td align='center'>"
        + "<a href='RESET_LINK' style='display:inline-block;background-color:#e50914;color:#ffffff;"
        + "text-decoration:none;padding:14px 40px;border-radius:6px;font-size:16px;font-weight:bold;"
        + "letter-spacing:0.5px;'>Reset your password</a>"
        + "</td></tr></table>"

        // Note
        + "<div style='background-color:#fff8e1;border-left:4px solid #ffc107;padding:15px 20px;margin:25px 0;border-radius:4px;'>"
        + "<p style='font-size:14px;color:#333;margin:0 0 8px;'><strong>Note:</strong></p>"
        + "<ul style='font-size:14px;color:#555;margin:0;padding-left:20px;line-height:1.8;'>"
        + "<li>The above link will expire in <strong>15 minutes</strong> from the time of request.</li>"
        + "<li>If you did not request a password reset, please ignore this email. Your account remains secure and no changes have been made.</li>"
        + "</ul></div>"

        // Contact
        + "<p style='font-size:14px;color:#888;margin:25px 0 0;line-height:1.6;'>"
        + "If you need further assistance, feel free to contact us.</p>"

        + "<hr style='border:none;border-top:1px solid #eee;margin:30px 0;'>"
        + "<p style='font-size:15px;color:#333;margin:0;'>Thank you for using <strong>AstraCine</strong>!</p>"
        + "</td></tr>"

        // Footer
        + "<tr><td style='background-color:#1a1a2e;padding:20px 40px;text-align:center;'>"
        + "<p style='color:#9090b0;font-size:12px;margin:0;'>&copy; 2026 AstraCine. All rights reserved.</p>"
        + "</td></tr>"

        + "</table></td></tr></table></body></html>";

    return html.replace("USER_NAME", username).replace("RESET_LINK", resetLink);
  }
}
