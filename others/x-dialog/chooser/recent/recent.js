

YAHOO.namespace("convio.itemchooser");
YAHOO.convio.itemchooser.RecentTab = {
  setupRecentTable : function(hostID) {
    var util = YAHOO.convio.itemchooser.ChooserUtil;
    
    //In this tab, we're using a static data source.  Thus, create the URL.
    var dataSourceURL = "/components/x-dialog/chooser/recent/recent-retrieve.jsp?hostID=" + hostID;
    if (util.baseType != "") {
      dataSourceURL += "&baseType=" + util.baseType;
    }
    var now = new Date();
    dataSourceURL += "&nocache=" + now.getTime();
 
    
    //Make a data source with that URL, expecting the result to be JSON, with a set of fields    
    var recentTableDataSource = new YAHOO.util.XHRDataSource(dataSourceURL,
      {
           responseType: YAHOO.util.DataSource.TYPE_JSON,
           responseSchema: {
             resultsList: "Recent.items",
             fields: ["URL", "Thumbnail", "Title", "FileName", "Folder", "Type", "Modified", "ID", "FolderID", "LiveURL", "IsLive", "IsAsset", "IsFolder", "Status", "Icon"] 
           }
      });
                      
    // Add the custom formatter so the Data Table can use it when entered by name
    YAHOO.widget.DataTable.Formatter.thumbnailCustom = util.thumbnailFormatter; 
                      
    //Column definitions.  Parser is used for sorting.  Formatter is used for thumbnails, so they show up as images.                  
    var recentColumnDefs = [
      {key:"Thumbnail", label:"", formatter:"thumbnailCustom"},
      {key:"Title", parser:"string", sortable:true}, 
      {key:"FileName", label:"File Name", parser:"string", sortable:true}, 
      {key:"Folder", parser:"string", sortable:true},
      {key:"Type", parser:"string", sortable:true}, 
      {key:"Status", parser:"string", sortable:true},
      {key:"Modified", parser:"date", sortable:true}
    ]; 
  
    //Config properties for this data table.  width, height are standard.  sortedBy is defined in the YUI API.
    var dataTableConfig =  { 
      width: "100%", 
      height: "365px",
      sortedBy:{key:"Modified", dir:YAHOO.widget.DataTable.CLASS_DESC} 
    };        
  
    //Finally, create a Scrolling Data Table with the above objects as parameters.
    var recentDataTable = new YAHOO.widget.ScrollingDataTable("ItemChooserRecentTabDiv", recentColumnDefs, recentTableDataSource, dataTableConfig);
    //Enables standard row selection:
    recentDataTable.set("selectionMode", "single");
    //We want to do the USUAL select row on a click event PLUS we want the util class to keep track of what was clicked.
    recentDataTable.subscribe("rowClickEvent", recentDataTable.onEventSelectRow);
    recentDataTable.subscribe("rowClickEvent", util.itemSelected, recentDataTable);
	recentDataTable.subscribe("rowMousedownEvent", YAHOO.convio.itemchooser.ChooserUtil.onRowSelect, recentDataTable);
  
    //This next line sets up the context menu for the items in this tab.
    YAHOO.convio.itemchooser.CmsChooserContextMenu.setupContextMenu(recentDataTable, "Recent", "ItemChooserRecentTabDiv");
  }

}
