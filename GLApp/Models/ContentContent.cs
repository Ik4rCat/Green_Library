using SQLite;

namespace GLApp.Models;

public class ContentContent
{
    [PrimaryKey, AutoIncrement]
    public int Docid { get; set; }

    [MaxLength(100)]
    public string C0articleId { get; set; }

    public string C1introText { get; set; }

    public string C2fullText { get; set; }

    public string C3language { get; set; }
}