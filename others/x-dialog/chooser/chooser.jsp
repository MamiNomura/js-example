<%--
 $Source: /home/cvs/cvsroot/cms/integration/web/components/x-dialog/chooser/chooser.jsp,v $
 $Author: mpih $
 $Revision: 1.66 $
 $Date: 2012/02/04 01:27:41 $
--%>

<%@ page contentType="text/html; charset=UTF-8"
	import="com.frontleaf.sql.*,
	        com.frontleaf.locale.Formats,
	        com.frontleaf.content.*,
	        com.frontleaf.content.util.RecentTracker,
	        com.frontleaf.request.RequestTools,
	        com.frontleaf.server.FileIconManager,
	        com.frontleaf.server.Host,
	        com.frontleaf.security.User,
	        com.frontleaf.util.StringTools,
	        java.util.ArrayList,
	        java.util.Date,
	        java.util.List" %>

<%@ taglib uri="http://www.frontleaf.com/tlds/ui-tags-1.0" prefix="ui" %>
<%@ taglib uri="http://www.frontleaf.com/tlds/request-tags-1.0" prefix="rc" %>

<rc:request>
  <parameter name="itemID" type="integer" required="false"/>
  <parameter name="folderID" type="folder" />
  <parameter name="baseType" type="string" default=""/>
  <parameter name="view" type="string" values="gallery,list" default="list"/>
  <parameter name="selectionType" type="string" values="image,all,none" 
             default="all"/>
  <parameter name="publish" type="boolean" default="false"/>
  <parameter name="recent" type="boolean" default="true"/>
  <parameter name="toolbars" type="boolean" default="true"/>
  <parameter name="startTab" type="string" default="browse"/>
  <parameter name="filterID" type="integer" required="false"/>
  <parameter name="showLinks" type="boolean" default="false"/>
  <parameter name="linkTitle" type="string" default="Selected Links"/>
  <parameter name="componentID" type="integer" required="false"/>
  <parameter name="isLinkSet" type="boolean" default="false"/>
  <parameter name="typeID" type="integer" required="false"/>
  <parameter name="showCOMLinksTab" type="boolean" default="false"/>
</rc:request>

<%
  final User user = (User) request.getUserPrincipal();

  Folder folder = (Folder) requestData.getObject("folderID");
  Host host = folder.getHost();

  // Permission check. The user must be an administrator.
  if (user == null || ! host.isAdmin(user)) {
    response.sendError(response.SC_UNAUTHORIZED);
    return;
  }

  String view = requestData.getString("view");
  String baseType = requestData.getString("baseType");
  String selectionType = requestData.getString("selectionType");
  String startTab = requestData.getString("startTab");
  String dialogTitle = selectionType.equals("image") ? "Choose Image" : "Website Explorer";
  Integer itemID = requestData.getInteger("itemID");
  
  boolean publish = requestData.getBoolean("publish");

  boolean isLinkSet = requestData.getBoolean("isLinkSet");


  boolean showRecent = requestData.getBoolean("recent");
  
  RecentTracker tracker = RecentTracker.getInstance(request);
  Folder lastFolder = tracker.getLastFolder(host);
  if (lastFolder != null) {
    folder = lastFolder;
  }

  Folder root = folder.getRoot();
  
  Integer filterID = requestData.getInteger("filterID");
  
  String paneQuery = 
    "context=dialog&folderID=" + folder.getID() 
      + "&view=" + StringTools.encode(view) 
      + "&baseType=" + StringTools.encode(baseType) 
      + "&subsiteID=" + root.getID();

  if (filterID != null) {
    paneQuery += "&filterID=" + filterID;
  }
  
  
  // Generate a path to the root folder.
  List<Folder> pathToRoot = new ArrayList<Folder>();
  Folder lastParent = folder;
  
  if (! root.equals(lastParent)) {
    pathToRoot.add(lastParent);
    while (! root.equals(lastParent.getParent())) {
      lastParent = lastParent.getParent();
      pathToRoot.add(lastParent);
    }
  }

  boolean showCOMLinksTab = requestData.getBoolean("showCOMLinksTab");
%>

<ui:dialog>
<ui:title><%=dialogTitle%></ui:title>
<ui:init>
  var gHostID = <%=host.getID()%>;
  var gItemID = <%=itemID%>;
  var gFolderID = <%=folder.getID()%>;
  var gRootID = <%=root.getID()%>;
  var gBaseType = '<%=StringTools.isEmpty(baseType) ? "" : StringTools.escapeQuotes(baseType)%>';
  var gPaneQuery = '<%=paneQuery%>';
  var gFilterID = <%=filterID %>;
  var gTypeID = <%= requestData.getInteger("typeID")%>;
  var gFoldersToExpand = [];
  <%
    for (int i = 0 ; i < pathToRoot.size() ; i ++) {
     
  %>
      gFoldersToExpand.push('<%=pathToRoot.get(i).getID()%>');
  <% 
    }
  %>   
  
  var dialogArguments = YAHOO.convio.dialog.getArgs(); 

  YAHOO.convio.itemchooser.ChooserUtil.setBaseType(gBaseType);
  YAHOO.convio.itemchooser.ChooserUtil.setItemID(gItemID);
  YAHOO.convio.itemchooser.ChooserUtil.setFilterID(gFilterID);
  <% if (isLinkSet) { %>
  YAHOO.convio.itemchooser.ChooserUtil.setTypeID(gTypeID);
  <%} else {%>
  YAHOO.convio.itemchooser.ChooserUtil.setTypeID(null);
  <%} %>   
  // Initialize tabs
  var tabView = new YAHOO.widget.TabView(); 
  YAHOO.convio.itemchooser.ChooserUtil.tabView = tabView;
  // Browse tab
  var tab1 = new YAHOO.widget.Tab({ 
    label: 'Browse', 
    dataSrc: "/components/x-dialog/chooser/browse/frame.jsp?" + gPaneQuery,
    cacheData: true,
    active: true
  });
  YAHOO.convio.itemchooser.ChooserUtil.browseTab = tab1;
  
  tab1.addListener("dataLoadedChange", function(o) {
      YAHOO.convio.itemchooser.BrowseTab._setSavedFolderID(gFolderID);
      YAHOO.convio.itemchooser.BrowseTab.selectOnExpand = false;
      YAHOO.convio.itemchooser.BrowseTab.setupBrowseTree(gRootID, gFolderID, gFoldersToExpand);
      YAHOO.convio.itemchooser.BrowseTab.setupBrowseTable(gFolderID);
      YAHOO.convio.itemchooser.ChooserUtil.setupButtons('bt');
       //And select the correct tab:
      var selectedTab = '<%=requestData.getString("startTab")%>';
      if (selectedTab == 'search') {
        YAHOO.convio.itemchooser.ChooserUtil.ready = true;
        YAHOO.convio.itemchooser.ChooserUtil.tabView.set('activeIndex', 1);
      } else if (selectedTab == 'recent') {
        YAHOO.convio.itemchooser.ChooserUtil.ready = true;
        YAHOO.convio.itemchooser.ChooserUtil.tabView.set('activeIndex', 2);
      }
    }, null);
  tabView.addTab(tab1); 
   
 
  // Search tab.
  var tab2 = new YAHOO.widget.Tab({
    label: 'Search',
    dataSrc: "/components/x-dialog/chooser/search/search.jsp?" + gPaneQuery,
    cacheData: true
  });

  YAHOO.convio.itemchooser.ChooserUtil.searchTab = tab2;
      
  tab2.addListener("dataLoadedChange", function(o) {
      YAHOO.convio.itemchooser.SearchTab.init(gHostID, gFolderID);
      YAHOO.convio.itemchooser.ChooserUtil.setupButtons('st');
    }, null);
  tabView.addTab(tab2); 
  

  // Recent tab.
  var tab3 = new YAHOO.widget.Tab({ 
    label: 'Recent', 
    dataSrc: "/components/x-dialog/chooser/recent/recent.jsp",
    cacheData: true
  });

  YAHOO.convio.itemchooser.ChooserUtil.recentTab = tab3;

  tab3.addListener("dataLoadedChange", function(o) { 
      YAHOO.convio.itemchooser.RecentTab.setupRecentTable(gHostID);
      YAHOO.convio.itemchooser.ChooserUtil.setupButtons('rt');
      YAHOO.convio.itemchooser.ChooserUtil.ready = true;
  }, null);
  tabView.addTab(tab3); 
  
  // Hiding the tabs (via the hidden_tab class) doesn't hide the panel, just the "tab" part.
  YAHOO.util.Dom.addClass(tab1, "hidden_tab"); 
  YAHOO.util.Dom.addClass(tab2, "hidden_tab");
  YAHOO.util.Dom.addClass(tab3, "hidden_tab");

  // COM Links tab - do we need?  
  <%if (showCOMLinksTab) {%>
    //If we're showing the COMLinksTab, we have to have an outer tab-view.
    var outerTabView = new YAHOO.widget.TabView(); 
    YAHOO.convio.itemchooser.ChooserUtil.outerTabView = outerTabView;

    var outerTab1 = new YAHOO.widget.Tab({
      label: 'CMS Items',
      content:"<div id='CMSItemsTab'/>",
      active: true
    });
          
    outerTabView.addTab(outerTab1); 
    
    var outerTab2 = new YAHOO.widget.Tab({ 
      label: 'Other Convio Items', 
      dataSrc: "/components/x-dialog/chooser/comlinks/frame.jsp",
      cacheData: true
    });
    YAHOO.convio.itemchooser.COMLinksTab.hostID = gHostID;
    outerTab2.addListener("dataLoadedChange", function(o) {
      YAHOO.convio.itemchooser.COMLinksTab.setupCOMLinkProvidersList();
      YAHOO.convio.itemchooser.COMLinksTab.setupCOMLinksTable();
    }, null);
    outerTabView.addTab(outerTab2); 
    outerTabView.appendTo('ItemChooserDialogTabs');
    tabView.appendTo('CMSItemsTab');
  <%} else {%>
    //No COMLinksTab means no need for the outer tabview.
    tabView.appendTo('ItemChooserDialogTabs');
  <%}%>
  // Make sure the browse tab is done loading before switching tabs.
  tabView.addListener('beforeActiveTabChange', function(e) {
    return YAHOO.convio.itemchooser.ChooserUtil.ready;
  });
       
  YAHOO.convio.itemchooser.ChooserUtil.tabView = tabView;
  dialogArguments.searchTabClass = YAHOO.convio.itemchooser.SearchTab;
  dialogArguments.browseTabClass = YAHOO.convio.itemchooser.BrowseTab;
  dialogArguments.recentTabClass = YAHOO.convio.itemchooser.RecentTab;
      
  //Uncomment these to see logging statements on IE7
  //var myContainer = document.body.appendChild(document.createElement("div"));
  //var myLogReader = new YAHOO.widget.LogReader(myContainer);
  <%if ( requestData.getBoolean("showLinks")) {%>
    YAHOO.convio.itemchooser.ChooserUtil.showLinks = true;
    if (dialogArguments.links) {
      YAHOO.util.Event.onAvailable("SelectedLinks", YAHOO.convio.itemchooser.LinksPanel.doSetup);
    }
  <%} else { %>
    YAHOO.convio.itemchooser.ChooserUtil.showLinks = false;
  <%} %>
  
</ui:init>
<ui:validate>
  var dialogArguments = YAHOO.convio.dialog.getArgs();

  <% if (isLinkSet) { %>
  var links = dialogArguments.returnValue;

  var queryString = "";
  if (links) {
    for (var i=0; i < links.length; i++) {
      var link = links[i];
      queryString += "itemID=" + link.id;
      if (i < links.length - 1) { queryString += "&"; }
    }
  }

  var data = new FormData("saveForm");
  data.setValue("queryString", queryString);
  data.setValue("title", document.getElementById("titleField").value);
  data.setValue("typeID", document.getElementById("typeSelector").value);
  <% } // end if (isLinkset) %>

</ui:validate>
<ui:body>
  <% if (isLinkSet) { %>
  <%@ include file="linkset.jspi"%>
  <% } %>

<div id="ItemChooserDialogTabs"></div>

<% if (requestData.getBoolean("showLinks")) { %>
<div id="ItemChooserLinksPanel">
  <h3><%=requestData.getString("linkTitle")%></h3>
  <ul id="SelectedLinks" class="draglist"></ul>
</div>
<% } %>

<div style="clear:both;"></div>

</ui:body>
</ui:dialog>
