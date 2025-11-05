using SQLite;

namespace GLApp.Models;

public class ContentStat
{
    [PrimaryKey, AutoIncrement]
    public int Id { get; set; }

    public byte[]? Value { get; set; }
}