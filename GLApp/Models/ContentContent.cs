using SQLite;

namespace MyApp.Models;

public class Articles
{
    [PrimaryKey, AutoIncrement]
    public int docid { get; set; }

    [MaxLength(100)]
    public string c0article_id { get; set; }

    public string c1intro_text { get; set; }

    public string c2full_text { get; set; }

    public string c3language { get; set; }
}