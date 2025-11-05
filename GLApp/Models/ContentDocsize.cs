using SQLite;

namespace GLApp.Models;

public class ContentDocsize
{
    [PrimaryKey, AutoIncrement]
    public int Docid { get; set; }

    [MaxLength(100)]
    public byte[]? Size { get; set; }

}