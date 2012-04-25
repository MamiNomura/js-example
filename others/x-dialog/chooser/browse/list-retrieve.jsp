

<%@ page contentType="text/html; charset=UTF-8"
         import="com.frontleaf.content.*,
                 com.frontleaf.image.ImageScaler,
                 com.frontleaf.locale.Formats,
                 com.frontleaf.server.DispatcherTools,
                 com.frontleaf.server.FileIconManager,
                 com.frontleaf.server.Host,
                 com.frontleaf.security.User,
                 com.frontleaf.util.PathTools,
                 com.frontleaf.util.StringTools,
                 com.frontleaf.request.RequestData,
                 com.frontleaf.sql.*,
                 java.text.NumberFormat,
                 java.util.ArrayList,
                 java.util.Collections,
                 java.util.Comparator,
                 java.util.Date,
                 java.util.HashMap,
                 java.util.Iterator,
                 java.util.List,
                 java.util.Map,
                 org.json.JSONArray,
                 org.json.JSONObject" %>

<%@ taglib uri="http://www.frontleaf.com/tlds/request-tags-1.0" prefix="rc" %>

<rc:request>
  <parameter name="folderID" type="folder"/>
  <parameter name="baseType" type="string" required="false"/>
  <parameter name="typeID" type="integer" required="false"/>
  <parameter name="pageStart" type="integer"/>
  <parameter name="pageEnd" type="integer"/>
  <parameter name="sortProperty" type="string" default="Title"/>
  <parameter name="sortAscending" type="boolean" default="true"/>
  <parameter name="context" type="string" values="dialog,explorer"
             default="dialog" />
  <parameter name="filterID" type="integer" required="false"/>
</rc:request>
<%! 
  public static class FolderComparator implements Comparator {
    private String sortBy;
    private boolean ascending;
    FolderComparator(final String sortBy, final boolean ascending) {
      super();
      this.sortBy = sortBy;
      this.ascending = ascending;
    }
    
    public int compare(Object o1, Object o2) {
      return compare((Folder)o1, (Folder)o2);
    }
    
    public int compare(Folder f1, Folder f2) {
      if (this.ascending) {
        Folder fTemp = f1;
        f1 = f2;
        f2 = fTemp;
      }
      if (this.sortBy.equals("Title") || this.sortBy.equals("FileName")) {
        return f2.getTitle().compareToIgnoreCase(f1.getTitle());
      } else if (sortBy.equals("Modified")) {
        return f2.getLastModified().compareTo(f1.getLastModified());
      } else return f2.getName().compareToIgnoreCase(f1.getName());
    }
  }

  private static class SortProperties {
    final String filterProperty;
    final boolean ignoreCase;

    SortProperties(String filterProperty) {
      this(filterProperty, true);
    }

    SortProperties(String filterProperty, boolean ignoreCase) {
      this.filterProperty = filterProperty;
      this.ignoreCase = ignoreCase;
    }

  }

  // Maps the UI sortBy keys to ContentFilter sortBy query properties.
  public static final Map<String,SortProperties> sortToFilterProperties = 
    new HashMap<String,SortProperties>();
  static {
    sortToFilterProperties.put("Title", new SortProperties("title"));
    sortToFilterProperties.put("FileName", new SortProperties("systemName"));
    sortToFilterProperties.put("Size", new SortProperties("bodySize", false));
    sortToFilterProperties.put("Type", new SortProperties("contentType"));
    //This is not perfect.  Maybe should change the content filter sort on this property.
    sortToFilterProperties.put("Status", new SortProperties("lifecycleState"));
    sortToFilterProperties.put("Modified", new SortProperties("lastModified", false));
  }
%>

<% 
  
  DispatcherTools.disableCache(response);

  User user = (User) request.getUserPrincipal();
  Folder folder = (Folder) requestData.getObject("folderID");

  if (! folder.checkPermission(user, "read")) {
    response.sendError(response.SC_UNAUTHORIZED);
    return;
  }

  boolean isAuthor = folder.checkPermission(user, "author");

  List<Folder> folders = new ArrayList<Folder>();
  for (Iterator<Folder> i = folder.getChildren(); i.hasNext();) { 
    Folder child = (Folder) i.next();
    if (child.checkPermission(user, "read")) {
      folders.add(child);
    }
  }

  //Sort the folders by the sort field:
  Collections.sort(folders, new FolderComparator(requestData.getString("sortProperty"), requestData.getBoolean("sortAscending")));
  
  String baseType = requestData.getString("baseType");
  Integer typeID = requestData.getInteger("typeID");

  int start = requestData.getInt("pageStart");
  int end = requestData.getInt("pageEnd");
  
  SearchResult result = null;
  if (end > folders.size()) {

    Integer filterID = requestData.getInteger("filterID");
    ContentFilter filter;
    if (filterID != null) {
      filter = (ContentFilter)(ContentFilter.find(filterID).clone());
      
      if (!filter.getContainers().hasNext() || filter.includesContainer(folder)) {
        filter.clearContainers();  //Doesn't do anything if the filter contains NO containers.
        filter.addContainer(folder, false);
      } else {
        //Return no results
        JSONObject responseJSON = new JSONObject();
        JSONObject contentsJSON = new JSONObject();
        responseJSON.put("FolderContents", contentsJSON);
        
        contentsJSON.put("resultCount", 0);
        
        JSONArray itemsJSON = new JSONArray();
        contentsJSON.put("items", itemsJSON);
        
        response.resetBuffer();
        out.write(responseJSON.toString());
        return;
      }
    } else {
      filter = new ContentFilter("", folder.getSubsite());
      filter.addContainer(folder, false);
    }
    
    if (typeID != null) {      
      ExtendedType type = (ExtendedType) ExtendedType.find(typeID);
      filter.setType(type);
    } else if (baseType != null && filter.getType() == null) {
      filter.setBaseType(Type.find(baseType));
    }
    
    
    filter.addProperty("title");
    filter.addProperty("bodySize");
    filter.addProperty("lastModified");
    filter.addProperty("contentType");
    filter.addProperty("systemName");
    filter.addProperty("folderID");
    filter.addProperty("mimeType");

    // Only show live items if the user is not an author of this folder (i.e., user is only a reader).
    filter.setLiveVersionRequired(! isAuthor);
    
    SortProperties sortProperties = sortToFilterProperties.get(requestData.getString("sortProperty"));

    filter.setSortProperty(sortProperties.filterProperty, requestData.getBoolean("sortAscending"), sortProperties.ignoreCase);

    filter.setResultRange(start - folders.size(), end - folders.size());

    result = filter.getResult();
  }

  String queryName = (typeID != null) ?
    "documentCountByExtendedType" : (baseType != null) ? 
    "documentCountByContentType" : "documentCount";

  Query query = StatementCatalog.getQuery("Folder", queryName);
  query.setID("folderID", folder);
  query.setString("contentType", baseType);
  query.setInteger("typeID", typeID);
  Integer itemCount = query.getInteger();

  FileIconManager iconManager = FileIconManager.getInstance(application);
  String previewURL = folder.getHost().getPreviewURL();

  String context = requestData.getString("context");
  int index = 1;

  NumberFormat f = NumberFormat.getIntegerInstance();
  
  JSONObject responseJSON = new JSONObject();
  JSONObject contentsJSON = new JSONObject();
  responseJSON.put("FolderContents", contentsJSON);
  
  contentsJSON.put("resultCount", itemCount.intValue() + folders.size());
  
  JSONArray itemsJSON = new JSONArray();
  contentsJSON.put("items", itemsJSON);

  
  int count = 0;
  for (int i = start; i <= end && i <= folders.size(); i++) { 
    Folder child = (Folder) folders.get(i - 1); 
    Date lastModified = child.getLastModified();
    
    HashMap map = new HashMap();
    map.put("ID", child.getID());  
    map.put("URL",child.getPath());
    map.put("LiveURL",child.getPath());
    map.put("BaseType","folder");
    map.put("Title","<a href='javascript:void(0);'>" + child.getTitle()+ "</a>");
    map.put("FileName",child.getName());
    map.put("Size","");
    map.put("Type","Folder");
    map.put("Status","-");
    map.put("Modified",Formats.getDateString(lastModified, Formats.DATE_TIME_SHORT));
    map.put("IsFolder","true");
    map.put("IsLive","false");
    map.put("IsAsset","false");
    String icon = "folder.png";
    if (!child.getACL().checkPermission(User.getAnonymousUser(),"read")) {
      icon = "folder-locked.gif";
    }
    map.put("Thumbnail", "/system/icons/24x24/" + icon);
    map.put("Icon", "/system/icons/24x24/" + icon);
  
    itemsJSON.put(map);
  }
 
  if (result != null) { 
    String state = null;

    while (result.hasNext()) { 

      DocumentView item = (DocumentView) result.nextItem(); 
      Type itemBaseType = item.getType();
      ExtendedType type = item.getExtendedType(); 
      String name = item.getName(); 
      String baseTypeName = itemBaseType.getName();

      String typeLabel = (type != null) ? type.getLabel() : itemBaseType.getLabel(); 

      if (baseTypeName.equals("file") && (type == null || type.isDefault())) {
        MimeType mimeType = MimeType.forName(item.getMimeType());
        if (! mimeType.isDefault()) {
          typeLabel = mimeType.getShortLabel();
        }
      }

      boolean isIndexPage = item.getID().equals(folder.getIndexPageID());
      if (isIndexPage) { 
        typeLabel = "Index Page";
      }

      RowDataSource itemData = ((DataSourceDocumentView) item).getDataSource();
      
      if (item.isLive()) {
	    boolean isPending = itemData.getDate("publicationDate") != null;
        state = (isPending)? "pending" : "live";
      } else {
        state = itemData.getString("lifecycleState");
        if (state.equals("approved")) {
          state = "pending";
        }
      }

      Date lastModified = item.getLastModified(); 

      // Generate the thumbnail URL.
      String thumbnail = null;
      if (isIndexPage) {
        // Index page.
        thumbnail = "/system/icons/48x48/home.gif";
      } else if (baseTypeName.equals("page")) {
        // Web page.
        thumbnail = "/assets/icons/32x32/page.gif";
      } else if (name == null || ! baseTypeName.equals("image")) {
        // File. XML.
        thumbnail = iconManager.getFileIcon(name, iconManager.LARGE);
      } else {
        // Image thumbnail.
        thumbnail = previewURL + item.getFolder().getPath() + ImageScaler.getName(name, 80);
        // For image thumbnails, append a last-modified query parameter
        thumbnail += "?m=" + lastModified.getTime();
      }

      String liveURL = DocumentTools.getURL(item.getFolder(), item.getID(), 
	                                    item.getName(), item.getType(), false); 

      String icon = isIndexPage ? "/system/icons/16x16/home.gif" :
      baseTypeName.equals("page") ? "/assets/icons/16x16/page.gif" : 
      iconManager.getFileIcon(name);
   
      long size = item.getSize();
      if (size < 1024) { size = 1024; }
      String bodySize = f.format(size / 1024L) + " KB";
  
      boolean isLive = Document.isLive(item.getID());
  
      boolean isAsset = !"page".equals(item.getType().getName()) && !"xml".equals(item.getType().getName());
   
      Map map = new HashMap();
      map.put("ID", item.getID());
      map.put("URL", item.getURL());
      map.put("LiveURL", liveURL);
      map.put("BaseType",baseTypeName);
      map.put("Thumbnail", thumbnail);
      map.put("Title",item.getTitle());
      map.put("FileName", item.getName());
      map.put("Size", size );
      map.put("Type", typeLabel);
      map.put("Status", state);
      map.put("Modified", Formats.getDateString(lastModified, Formats.DATE_TIME_SHORT));
      map.put("FolderID", item.getFolder().getID() );
      map.put("IsFolder", "false");
      map.put("IsAsset", Boolean.toString(isAsset));
      map.put("IsLive", Boolean.toString(isLive));
      map.put("Icon", icon);
   
      itemsJSON.put(map);
    }
  }
   
  response.resetBuffer();
  out.write(responseJSON.toString());
%>