using MailKit.Net.Imap;
using MailKit.Search;
using MimeKit;
using System;
using System.IO;
using System.Threading.Tasks;

class Program
{
    static async Task Main()
    {
        using var client = new ImapClient();
        await client.ConnectAsync("outlook.office365.com", 993, true);
        await client.AuthenticateAsync("yair@simplevision.co.il", "");

        var inbox = client.Inbox;
        await inbox.OpenAsync(MailKit.FolderAccess.ReadOnly);

        var uids = await inbox.SearchAsync(SearchQuery.NotSeen);
        foreach (var uid in uids)
        {
            var message = await inbox.GetMessageAsync(uid);
            Console.WriteLine($">>> {message.Subject}");

            foreach (var attachment in message.Attachments)
            {
                if (attachment is MimePart part)
                {
                    var fileName = part.FileName;
                    using var stream = File.Create(Path.Combine("downloads", fileName));
                    await part.Content.DecodeToAsync(stream);
                    Console.WriteLine($"Downloaded: {fileName}");
                }
            }
        }

        await client.DisconnectAsync(true);
    }
}