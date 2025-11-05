using SQLite;

namespace MyApp.Models;

public class Articles
{
    [PrimaryKey, AutoIncrement]
    public int article_id { get; set; }

    [MaxLength(100)]
    public string intro_text { get; set; }

    public string full_text { get; set; }

    public string language { get; set; }
}