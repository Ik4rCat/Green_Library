namespace GLApp.Models;

public class Content
{
    string titleSample= "sample Title", textSample= "sample Text";

    //data part

    private readonly Data data = new Data();

    public string GetTitle(int index) => data.GetTitle(index);
    public string GetText(int index) => data.GetText(index);

    public class Data
    {
        private readonly string[] titles = new string[1000];
        private readonly string[] texts = new string[1000];

        public Data()
        {
            InitializeData();
        }

        private void InitializeData()
        {
            titles[0] = """
            <html>
            <head></head>
                <body>
                    <h1>Абутилон</h1>
                </body>
            </html>
            """;
            texts[0] = "Комнатное растение абутилон...";
        }

        public string GetTitle(int index)
        {
            return index >= 0 && index < titles.Length ? titles[index] : string.Empty;
        }

        public string GetText(int index)
        {
            return index >= 0 && index < texts.Length ? texts[index] : string.Empty;
        }

    }
}