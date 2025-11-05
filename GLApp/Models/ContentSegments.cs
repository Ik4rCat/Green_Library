using SQLite;

namespace GLApp.Models;

public class ContentSegments
{
    [PrimaryKey, AutoIncrement]
    public int Blockid { get; set; }

    public byte[] Block { get; set; }
}