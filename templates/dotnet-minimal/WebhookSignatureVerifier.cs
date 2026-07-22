using System;
using System.Collections.Generic;
using System.Globalization;
using System.Security.Cryptography;
using System.Text;

public static class WebhookSignatureVerifier
{
    private const long MaxSkewSeconds = 300;

    public static bool Verify(string rawBody, string header, string signingSecret)
    {
        if (
            rawBody is null
            || string.IsNullOrEmpty(header)
            || string.IsNullOrEmpty(signingSecret)
        )
        {
            return false;
        }
        long? timestamp = null;
        List<byte[]> signatures = new List<byte[]>();
        foreach (string item in header.Split(','))
        {
            int separator = item.IndexOf('=');
            if (separator <= 0 || separator == item.Length - 1)
            {
                continue;
            }
            string name = item[..separator].Trim();
            string value = item[(separator + 1)..].Trim();
            if (name == "t")
            {
                if (
                    !long.TryParse(
                        value,
                        NumberStyles.None,
                        CultureInfo.InvariantCulture,
                        out long parsedTimestamp
                    )
                )
                {
                    return false;
                }
                timestamp = parsedTimestamp;
            }
            else if (name == "v1")
            {
                try
                {
                    signatures.Add(Convert.FromHexString(value));
                }
                catch (FormatException)
                {
                    return false;
                }
            }
        }
        if (timestamp is null || signatures.Count == 0)
        {
            return false;
        }
        long requestTimestamp = timestamp.Value;
        long now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        if (
            requestTimestamp < now - MaxSkewSeconds
            || requestTimestamp > now + MaxSkewSeconds
        )
        {
            return false;
        }
        byte[] payload = Encoding.UTF8.GetBytes($"{requestTimestamp}.{rawBody}");
        byte[] expected = HMACSHA256.HashData(Encoding.UTF8.GetBytes(signingSecret), payload);
        bool verified = false;
        foreach (byte[] signature in signatures)
        {
            verified |= CryptographicOperations.FixedTimeEquals(expected, signature);
        }
        return verified;
    }
}
