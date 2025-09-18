import win32com.client

try:
    # Excel Application
    LXODExcelApp = win32com.client.Dispatch("Excel.Application")
    LXODExcelApp.Visible = True
    filename = "E:\\Onedrive\\Logos\\OneDrive - Logos Evangelical Seminary\\Geek\\Python\\Study\\LXOD.xlsx"
    LXODWorkbook = LXODExcelApp.Workbooks.Open(filename)
    
    # Dictionary to store named ranges
    Box_Dict = {}
    
    # Retrieve named ranges from Excel workbook
    for nameRange in LXODWorkbook.Names:
        the_name_of_the_range = nameRange.Name
        the_index_of_the_range = nameRange.Index
        Box_Dict[the_index_of_the_range] = the_name_of_the_range
    
    # PowerPoint Application
    LXODPPTApp = win32com.client.Dispatch("PowerPoint.Application")
    LXODPPTApp.Visible = True
    
    # Create a new presentation
    BossPPT = LXODPPTApp.Presentations.Add()
    
    # Iterate over Box_Dict and paste each named range into a slide
    for key, value in Box_Dict.items():
        PPTSlide = BossPPT.Slides.Add(key, Layout=12)
        LXODExcelApp.Range(value).Copy()
        PPTSlide.Shapes.PasteSpecial(DataType=2)  # Paste as Excel worksheet object
    
except FileNotFoundError:
    print(f"Error: The file LXOD.xlsx was not found.")
except Exception as e:
    print(f"An error occurred: {e}")

finally:
    # Check if LXODWorkbook is defined and close it
    if 'LXODWorkbook' in locals():
        LXODWorkbook.Close(SaveChanges=False)
    
    # Quit Excel Application
    LXODExcelApp.Quit()
    
    # Close the presentation and quit PowerPoint
    if 'BossPPT' in locals():
        BossPPT.Close()
    LXODPPTApp.Quit()