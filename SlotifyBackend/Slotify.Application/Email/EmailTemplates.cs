using System.Net;
using System.Text;

namespace Slotify.Application.Email;

public record EmailContent(string Subject, string Html, string Text);

public static class EmailTemplates
{
    private static string Enc(string value) => WebUtility.HtmlEncode(value);

    public static EmailContent Build(
        string subject,
        string heading,
        IReadOnlyList<string> lines,
        string? buttonLabel = null,
        string? buttonUrl = null,
        string? footer = null)
    {
        var html = new StringBuilder();
        html.Append("<!doctype html><html><body style=\"margin:0;padding:24px;background:#f4f5f8;font-family:Arial,Helvetica,sans-serif;color:#222\">");
        html.Append("<div style=\"max-width:520px;margin:0 auto;background:#ffffff;border-radius:8px;padding:24px\">");
        html.Append($"<h2 style=\"margin-top:0\">{Enc(heading)}</h2>");

        foreach (var line in lines)
            html.Append($"<p style=\"line-height:1.5\">{Enc(line)}</p>");

        var text = new StringBuilder();
        text.AppendLine(heading).AppendLine();
        foreach (var line in lines)
            text.AppendLine(line).AppendLine();

        if (buttonLabel is not null && buttonUrl is not null)
        {
            html.Append($"<p><a href=\"{Enc(buttonUrl)}\" style=\"display:inline-block;background:#3880ff;color:#ffffff;padding:12px 20px;border-radius:6px;text-decoration:none\">{Enc(buttonLabel)}</a></p>");
            html.Append($"<p style=\"color:#666;font-size:12px\">Ako dugme ne radi, kopiraj ovaj link u pregledač:<br>{Enc(buttonUrl)}</p>");
            text.AppendLine($"{buttonLabel}: {buttonUrl}").AppendLine();
        }

        if (footer is not null)
        {
            html.Append($"<p style=\"color:#666;font-size:12px\">{Enc(footer)}</p>");
            text.AppendLine(footer);
        }

        html.Append("</div></body></html>");
        return new EmailContent(subject, html.ToString(), text.ToString().TrimEnd());
    }
}