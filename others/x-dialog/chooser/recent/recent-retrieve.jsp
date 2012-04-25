
<%@ page contentType="text/javascript; charset=UTF-8"
  import="com.frontleaf.sql.*,com.frontleaf.locale.Formats,
          com.frontleaf.image.ImageScaler,
          com.frontleaf.content.*,
          com.frontleaf.content.util.RecentTracker,
          com.frontleaf.server.FileIconManager,
          com.frontleaf.server.Host,
          com.frontleaf.security.User,
          com.frontleaf.util.StringTools,
          java.util.Iterator,
          java.util.Date,
          java.util.HashMap,
          org.json.JSONArray,
          org.json.JSONObject" %>
<%!
private static final String CATALOG = "admin/RecentDocuments"; 
%>
<%@ taglib uri="http://www.frontleaf.com/tlds/request-tags-1.0" prefix="rc" %>
<rc:request>
  <parameter name="hostID" type="integer"/>
  <parameter name="baseType" type="string" required="false"/>
</rc:request>
<% 
  User user = (User) request.getUserPrincipal();

  Integer hostID = requestData.getInteger("hostID");
  Host host = Host.find(hostID);

  String baseType = requestData.getString("baseType");

  Query query = StatementCatalog.getQuery(CATALOG, "recent");;
  if (baseType == null) { 
    query.setVariable("contentTypeClause", "");
  } else {
    query.setVariable("contentTypeClause", 
	        "and content_type = '" + baseType + "'");
  }
  query.setID("userID", user);
  query.setID("rootID", host.getRootFolder());
  TableDataSource data = query.getTableDataSource(20);

  FileIconManager iconManager = FileIconManager.getInstance(application);

  String previewURL = host.getPreviewURL();
  
  //Let's switch to using the JSON API:
  JSONObject responseJSON = new JSONObject();
  
  JSONObject recentJSON = new JSONObject();
  responseJSON.put("Recent", recentJSON);

  recentJSON.put("resultCount", data.getRowCount());
  JSONArray itemsJSON = new JSONArray();
  
  recentJSON.put("items", itemsJSON);
  
  int count = 0;
  while (data.next()) { 
    DocumentView item = new DataSourceDocumentView(data); 
    Folder folder = item.getFolder(); 
    ExtendedType type = item.getExtendedType(); 
    Type itemBaseType = item.getType();
    String baseTypeName = itemBaseType.getName();

    String typeLabel = (type != null) ? 
                       type.getLabel() : item.getType().getLabel(); 
    String name = item.getName();
    String liveURL = 
      DocumentTools.getURL(item.getFolder(), item.getID(), 
			   item.getName(), item.getType(), false); 
    String thumbnail = (name == null || ! item.getType().equals("image")) ? 
      iconManager.getFileIcon(name, iconManager.LARGE) :
      previewURL + item.getFolder().getPath() +  
      ImageScaler.getName(name, 80);
  
    boolean isLive = Document.isLive(item.getID());
    
    boolean isAsset = !"page".equals(item.getType().getName()) && !"xml".equals(item.getType().getName());      
    String state = "";
    if (Document.isLive(item.getID())) {
 	  state = "live";
    } else {
	  if (item instanceof Document) {
	    Lifecycle lifecycle = ((Document)item).getLifecycle(Repository.DRAFT);
	    state = lifecycle.getState().getKey();
	    if (state.equals("approved")) state = "pending";
      } else {
	    state = "draft";
	  }
 	}
    boolean isIndexPage = item.getID().equals(folder.getIndexPageID());
    
    String icon = isIndexPage ? "/system/icons/16x16/home.gif" :
      baseTypeName.equals("page") ? "/assets/icons/16x16/page.gif" : 
      iconManager.getFileIcon(name);
   
    
    HashMap map = new HashMap();
    map.put("Thumbnail", thumbnail);
    map.put("ID", item.getID());
    map.put("FolderID", item.getFolder().getID());
    map.put("URL", item.getURL());
    map.put("LiveURL", liveURL);
	map.put("Title", item.getTitle());
	map.put("FileName", item.getName());
	map.put("Type", item.getExtendedType().getLabel());
	map.put("Modified", Formats.getDateString(item.getLastModified(), Formats.DATE_TIME_SHORT));
	map.put("Folder", folder.getTitle());
	map.put("Status", state);
	map.put("IsLive", Boolean.toString(isLive));
    map.put("IsAsset", Boolean.toString(isAsset));
    map.put("IsFolder", "false");
    map.put("Icon", icon);
    
    itemsJSON.put(map);
  }
  
  response.resetBuffer();
  out.write(responseJSON.toString());
  %>