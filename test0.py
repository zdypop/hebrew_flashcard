import win32com.client as win32
import pythoncom

# Define our application events
class ApplicationEvents:
    def OnSheetSelectionChange(self, *args):
        print('Application - Sheet selection changed:', args)

class WorkbookEvents:
    def OnSheetSelectionChange(self, *args):
        print('Workbook - Sheet selection changed:', args)
        if len(args) > 1:
            print('Sheet address:', args[1].Address)

try:
    excel_app = win32.GetActiveObject('Excel.Application')
except Exception as e:
    print(f'Error accessing Excel application: {e}')
    quit()

try:
    workbook_name = "工作簿1"
    workbook = excel_app.Workbooks(workbook_name)
except Exception as e:
    print(f'Error opening workbook "{workbook_name}": {e}')
    quit()

excel_events = win32.WithEvents(excel_app, ApplicationEvents)
workbook_events = win32.WithEvents(workbook, WorkbookEvents)

try:
    while True:
        pythoncom.PumpWaitingMessages()
except KeyboardInterrupt:
    print('Exiting...')