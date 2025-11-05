using SQLite;

namespace MyApp.Models;

public class Articles
{
    [PrimaryKey, AutoIncrement]
    public int article_id { get; set; }

    [MaxLength(100)]
    public string article_name { get; set; }

    public string family { get; set; }

    public string category { get; set; }

    public string kind { get; set; }
}