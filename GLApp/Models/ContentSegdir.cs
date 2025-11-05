using SQLite;

namespace MyApp.Models;

public class Articles
{
    [PrimaryKey, AutoIncrement]
    public int level { get; set; }

    public int idx { get; set; }

    public int start_block { get; set; }

    public int leaves_end_block { get; set; }

    public int end_block { get; set; }

    public byte[] root { get; set; }
}