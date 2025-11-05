using SQLite;

namespace GLApp.Models;

public class AndroidMetadata
{
    [PrimaryKey, AutoIncrement]
    public string Locale { get; set; }
}