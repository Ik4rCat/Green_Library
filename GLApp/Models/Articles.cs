using SQLite;

namespace GLApp.Models;

public class Articles
{
    [PrimaryKey, AutoIncrement]
    public int Article_id { get; set; }

    [MaxLength(100)]
    public string? Article_name { get; set; }

    public string? Family { get; set; }

    public string? Category { get; set; }

    public string? Kind { get; set; }
}