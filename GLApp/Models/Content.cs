using SQLite;

namespace GLApp.Models;

public class Content
{
    [PrimaryKey, AutoIncrement]
    public int ArticleId { get; set; }

    [MaxLength(100)]
    public string IntroText { get; set; }

    public string FullText { get; set; }

    public string Language { get; set; }
}