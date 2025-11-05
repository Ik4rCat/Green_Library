using SQLite;

namespace MyApp.Models;

public class AndroidMetadata
{
    [PrimaryKey, AutoIncrement]
    public string locale { get; set; }
}