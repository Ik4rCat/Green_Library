using SQLite;

namespace MyApp.Models;

public class Articles
{
    [PrimaryKey, AutoIncrement]
    public int docid { get; set; }

    [MaxLength(100)]
    public byte[] size { get; set; }

}