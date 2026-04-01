package com.astracine.backend.core.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;
import com.astracine.backend.presentation.dto.invoice.ETicketDTO;

@Service
public class EmailServiceImpl implements EmailService {

  private final JavaMailSender mailSender;
  private final TemplateEngine templateEngine;

  @Value("${spring.mail.username}")
  private String fromEmail;

  public EmailServiceImpl(JavaMailSender mailSender, TemplateEngine templateEngine) {
    this.mailSender = mailSender;
    this.templateEngine = templateEngine;
  }

  @Override
  public void sendPasswordResetEmail(String toEmail, String username, String resetLink) {
    try {
      MimeMessage message = mailSender.createMimeMessage();
      MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

      helper.setFrom(fromEmail);
      helper.setTo(toEmail);
      helper.setSubject("AstraCine - Password Reset Request");

      Context context = new Context();
      context.setVariable("username", username);
      context.setVariable("resetLink", resetLink);
      String html = templateEngine.process("password-reset", context);

      helper.setText(html, true);

      mailSender.send(message);

    } catch (MessagingException e) {
      throw new RuntimeException("Failed to send password reset email: " + e.getMessage(), e);
    }
  }

  @Override
  public void sendTicketEmail(String toEmail, ETicketDTO eTicket) {
    try {
      MimeMessage message = mailSender.createMimeMessage();
      MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

      helper.setFrom(fromEmail);
      helper.setTo(toEmail);
      helper.setSubject("AstraCine - Ticket #" + eTicket.getOrderCode());

      Context context = new Context();
      context.setVariable("eTicket", eTicket);
      String html = templateEngine.process("ticket-email", context);

      helper.setText(html, true);

      mailSender.send(message);

    } catch (MessagingException e) {
      throw new RuntimeException("Failed to send ticket email: " + e.getMessage(), e);
    }
  }
}
