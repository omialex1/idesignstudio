export function baseEmailHtml(bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="ro">
<body style="margin:0;padding:0;background-color:#FDFAF5;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#FDFAF5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #EFE4D0;">
          <tr>
            <td style="padding:24px 32px;border-bottom:1px solid #EFE4D0;">
              <span style="font-size:20px;font-weight:600;color:#4F3527;">iDesignStudio<span style="color:#C1663F;">.ro</span></span>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;color:#2B1D14;font-size:15px;line-height:1.6;">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #EFE4D0;color:#8A6A54;font-size:12px;">
              iDesignStudio.ro
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buttonHtml(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;margin-top:16px;padding:12px 28px;background-color:#C1663F;color:#FDFAF5;text-decoration:none;border-radius:999px;font-weight:600;font-size:14px;">${label}</a>`;
}
