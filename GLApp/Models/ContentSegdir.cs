using SQLite;

namespace GLApp.Models;

public class ContentSegdir
{
    [PrimaryKey, AutoIncrement]
    public int Level { get; set; }

    public int Idx { get; set; }

    public int StartBlock { get; set; }

    public int LeavesEndBlock { get; set; }

    public int EndBlock { get; set; }

    public byte[] Root { get; set; }
}