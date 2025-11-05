using SQLite;

namespace MyApp.Models;

public class Articles
{
    [PrimaryKey, AutoIncrement]
    public int blockid { get; set; }

    public byte[] block { get; set; }
}