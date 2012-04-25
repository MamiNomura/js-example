

<%@ page contentType="text/javascript; charset=UTF-8"
         import="com.frontleaf.sql.*,
                 com.frontleaf.locale.Formats,
                 com.frontleaf.image.ImageScaler,
                 com.frontleaf.content.*,
                 com.frontleaf.data.Column,
                 com.frontleaf.request.RequestTools,
                 com.frontleaf.server.DispatcherTools,
                 com.frontleaf.server.FileIconManager,
                 com.frontleaf.server.Host,
                 com.frontleaf.security.User,
                 com.frontleaf.util.JSONTools,
                 com.frontleaf.util.PathTools,
                 com.frontleaf.util.StringTools,
                 java.text.NumberFormat,
                 java.util.ArrayList,
                 java.util.Collections,
                 java.util.Comparator,
                 java.util.Date,
                 java.util.Iterator,
                 java.util.HashMap,
                 java.util.logging.Logger,
                 org.json.JSONObject,
                 org.json.JSONArray" %>

<%@ taglib uri="http://www.frontleaf.com/tlds/request-tags-1.0" prefix="rc" %>

<rc:request>
  <parameter name="keywords" type="string" required="false"/>
  <parameter name="hostID" type="integerarray"/>
  <parameter name="fields" type="stringarray" required="false"/>
  <parameter name="folderID" type="integerarray" required="false"/>
  <parameter name="typeID" type="integerarray" required="false"/>
  <parameter name="origin" type="string" values="admin,public" required="false"/>
  <parameter name="modifiedStart" type="datetime" required="false"/>
  <parameter name="modifiedEnd" type="datetime" required="false"/>
  <parameter name="publishedStart" type="datetime" required="false"/>
  <parameter name="publishedEnd" type="datetime" required="false"/>
  <parameter name="baseType" type="string" required="false"/>
  <parameter name="mimeType" type="string" required="false"/>
  <parameter name="page" type="integer" default="1"/>
  <parameter name="pageSize" type="integer" default="20"/>
  <parameter name="sortProperty" type="string" default="Modified"/>
  <parameter name="sortAscending" type="boolean" default="true"/>
  <parameter name="context" type="string" values="dialog,explorer"
             default="explorer" />
</rc:request>

<%!
  private static final Logger log = Logger.getLogger("com.frontleaf.content");

  // One millisecond less than one full day in msec.
  private static final long ONE_DAY_IN_MILLIS = 1000 * 60 * 60 * 24 - 1;

  private static class HashMapComparator  implements Comparator {
    private String sortBy;
    private boolean ascending;
    HashMapComparator(final String sortBy, final boolean ascending) {
      super();
      this.sortBy = sortBy;
      this.ascending = ascending;
    }
    
    public int compare(Object o1, Object o2) {
      return compare((HashMap)o1, (HashMap)o2);
    }
    
    public int compare(HashMap h1, HashMap h2) {
      if (!this.ascending) {
        HashMap hTemp = h1;
        h1 = h2;
        h2 = hTemp;
      }
      
      Object objToCompare1 = h1.get(sortBy);
      Object objToCompare2 = h2.get(sortBy);
      if (objToCompare1 == null && objToCompare2 == null) {
        return 0; // equality.
      } else if (objToCompare1 == null && objToCompare2 != null) {
        return -1;
      } else if (objToCompare1 != null && objToCompare2 == null) {
        return 1;
      } else if (objToCompare1 instanceof String) {
	return ((String) objToCompare1).compareToIgnoreCase((String)objToCompare2);
      } else if (objToCompare1 instanceof Date) {
	return ((Date)objToCompare1).compareTo((Date)objToCompare2);
      } else if (objToCompare1 instanceof Integer) {
	return ((Integer)objToCompare1).compareTo((Integer)objToCompare2);
      } else return 0; //Equality.
    }
  }
%>

<% 
  User user = (User) request.getUserPrincipal();

  String context = requestData.getString("context");

  Integer[] hostIDs = requestData.getIntegerArray("hostID");
  boolean isMultiHost = hostIDs.length > 1;
  Host host = Host.find(hostIDs[0]);

  SearchQuery query = new SearchQuery(host, user);
  for (int h = 0; h < hostIDs.length; h++) {
    Host otherHost = Host.find(hostIDs[h]);
    query.addHost(otherHost);
  }

  String[] keywordFields = requestData.getStringArray("fields");
  if (keywordFields != null) {
    for (int i = 0; i < keywordFields.length; i++) {
      String field = keywordFields[i];
      if (! field.equals("__any")) {
	query.addTextField(field);
      }
    }
  }

  String queryString = requestData.getString("keywords");
  if (queryString != null) {
    query.setText(queryString);
  }

  String mimeType = requestData.getString("mimeType");
  if (mimeType != null) {
    query.addMimeType(mimeType);
  }

  query.setVersion(Repository.DRAFT);

  String baseType = requestData.getString("baseType");
  if (baseType != null) {
    query.addType(Type.find(baseType));
  } 

  Integer[] folderIDs = requestData.getIntegerArray("folderID");
  if (folderIDs != null) {
    for (int i = 0; i < folderIDs.length; i++) {
      Folder folder = Folder.find(folderIDs[i]);
      query.addFolder(folder, true); //Include subfolders
    }
  }

  // Filter by origin.
  String origin = requestData.getString("origin");
  if (! StringTools.isEmpty(origin)) {
    query.setOrigin(origin);
  }

  Integer[] typeIDs = requestData.getIntegerArray("typeID");
  if (typeIDs != null) {
    for (int m=0; m<typeIDs.length; m++) {
      Integer typeID = typeIDs[m];
      if (typeID != null) {
        ExtendedType type = (ExtendedType) ExtendedType.find(typeID);
        query.addExtendedType(type);

        for (Iterator i = type.getColumns(); i.hasNext();) { 
          Column column = (Column) i.next(); 
          if (column.getType().equals("itemarray")) {
            String[] values = RequestTools.getParameterValues(request, "array_" + column.getName()); 
                               
            for (int j = 0; j < values.length; j++) {
              if (values[j].equals("")) { continue; }
              query.addRelatedItem(column.getName(), new Integer(values[j]));
            }
          } else if (column.getType().equals("categoryarray")) {
            String[] values = RequestTools.getParameterValues(request, "array_" + column.getName());                                                          
            for (int j = 0; j < values.length; j++) {
              if (values[j].equals("")) { continue; }
              query.addCategory(column.getName(), new Integer(values[j]));
            }
          }
        }
      }
    }
  }

  Date modifiedStart = requestData.getDate("modifiedStart");
  if (modifiedStart != null) {
    query.setModifiedAfter(modifiedStart);
  }

  Date modifiedEnd = requestData.getDate("modifiedEnd");
  if (modifiedEnd != null) {
    // Need to include up to 1 msec before midnight on the specified date
    query.setModifiedBefore(new Date(modifiedEnd.getTime() + ONE_DAY_IN_MILLIS));
  }

  Date publishedStart = requestData.getDate("publishedStart");
  if (publishedStart != null) {
    query.setPublishedAfter(publishedStart);
  }

  Date publishedEnd = requestData.getDate("publishedEnd");
  if (publishedEnd != null) {
    // Need to include up to 1 msec before midnight on the specified date
    query.setPublishedBefore(new Date(publishedEnd.getTime() + ONE_DAY_IN_MILLIS));
  }

  
  SearchResult results = query.getResult();

  int pageSize = requestData.getInt("pageSize");
  results.setPageSize(pageSize);
  int pageIndex = requestData.getInt("page");
  results.setPage(pageIndex);

  NumberFormat f = NumberFormat.getIntegerInstance();

  FileIconManager iconManager = FileIconManager.getInstance(application);
  String previewURL = host.getPreviewURL();
  
  //Result list is a way to hack around problems sorting in the SearchRequest:
   
  ArrayList<HashMap<String, Object>> resultList = new ArrayList<HashMap<String, Object>>();
    
   while (results.hasNext()) { 

    ItemView item = results.nextItem(); 
    Type itemBaseType = item.getType();
    String baseTypeName = itemBaseType.getName();
    
    ExtendedType type = item.getExtendedType(); 
    String typeLabel = 
      (type != null) ? type.getLabel() : itemBaseType.getLabel(); 

    if (baseTypeName.equals("file") && 
        (type == null || type.isDefault())) {
      MimeType itemMimeType = MimeType.forName(item.getMimeType());
      if (! itemMimeType.isDefault()) {
        typeLabel = itemMimeType.getShortLabel();
      }
    }

    Folder folder = item.getFolder(); 
    String folderID = (folder == null) ? "" : folder.getID().toString();
    String url = item.getURL(); 
    String name = (url == null || url.indexOf("?itemID") != -1) ? null : 
                    PathTools.getFileName(url, '/'); 

    String liveURL = (folder == null) ? url :
    DocumentTools.getURL(folder, item.getID(), name, itemBaseType, false);

    String adminURL = (type != null) ? type.getBaseType().getAdminPath() + "?itemID=" + item.getID() : "";
    
    String thumbnail = 
      (name == null || folder == null || ! item.getType().equals("image")) ? 
       iconManager.getFileIcon(name, iconManager.LARGE) :
       previewURL + folder.getPath() + ImageScaler.getName(name, 80); 
       
 	 long size = item.getSize();
     if (size < 1024) { size = 1024; }
	 String bodySize = f.format(size / 1024L) + " KB";
	 
	 boolean isLive = Document.isLive(item.getID());
   
     boolean isAsset = !"page".equals(item.getType().getName()) && !"xml".equals(item.getType().getName());      
     
     boolean isIndexPage = item.getID().equals(folder.getIndexPageID());
     
     String icon = isIndexPage ? "/system/icons/16x16/home.gif" :
       baseTypeName.equals("page") ? "/assets/icons/16x16/page.gif" : 
       iconManager.getFileIcon(name);
    
     
     HashMap<String, Object> result = new HashMap<String, Object>();
	 result.put("Modified", item.getLastModified());
	 result.put("Title", item.getTitle());
	 result.put("Thumbnail", thumbnail);
	 result.put("ID", item.getID());
	 result.put("LiveURL", liveURL);
	 result.put("URL", url);
	 result.put("Size", bodySize);
	 result.put("FileName", name);
	 result.put("Folder", item.getFolder().getPath());
	 result.put("FolderID", item.getFolder().getID());
	 result.put("Type", typeLabel);
	 result.put("IsLive", isLive);
	 result.put("IsAsset", isAsset);
	 result.put("IsFolder", false);
	 result.put("Icon", icon);
	 
	 resultList.add(result);
	 
	 //Now sort the list:
   }
   Collections.sort(resultList, new HashMapComparator(requestData.getString("sortProperty"), requestData.getBoolean("sortAscending")));	 

   JSONObject responseJSON = new JSONObject();
   JSONObject searchResultsJSON = new JSONObject();
   responseJSON.put("SearchResults", searchResultsJSON);
   searchResultsJSON.put("resultCount", results.getLength());
   
   JSONArray itemsJSON = new JSONArray();
   searchResultsJSON.put("items", itemsJSON);
   for (int i = 0 ; i < resultList.size() ; i ++) { 
     HashMap<String, Object> result = resultList.get(i);
     itemsJSON.put(result);
     
   }
   
   JSONTools.write(response, responseJSON);
%>