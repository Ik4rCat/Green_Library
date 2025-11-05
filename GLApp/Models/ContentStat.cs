using SQLite;

namespace MyApp.Models;

public class Articles
{
    [PrimaryKey, AutoIncrement]
    public int id { get; set; }

    public byte[] value { get; set; }
}