<%@ page contentType="text/javascript; charset=UTF-8"
         import="com.frontleaf.content.Folder,
                 com.frontleaf.security.*,
                 java.util.HashMap,
                 java.util.Iterator,
                 org.json.JSONArray,
                 org.json.JSONObject" %>

<%@ taglib uri="http://www.frontleaf.com/tlds/request-tags-1.0" prefix="rc" %>

<rc:request>
  <parameter name="folderID" type="folder" />
  <parameter name="requiredPerm" type="string" default="read" />
</rc:request>

<%! 
  private static final String CATALOG = "type/ExtendedType";
%>
<%
  User user = (User) request.getUserPrincipal();
  Folder folder = (Folder) requestData.getObject("folderID");
  String requiredPerm = requestData.getString("requiredPerm");
  
  JSONObject responseJSON = new JSONObject();
  
  JSONObject folderJSON = new JSONObject();
  responseJSON.put("FolderAndChildren", folderJSON);

  folderJSON.put("id", folder.getID());
  folderJSON.put("label", folder.getTitle());
  
  JSONArray childrenJSON = new JSONArray();
  folderJSON.put("children", childrenJSON);
  
  //Retrieve the children of the folder passed in:
  Iterator<Folder> folders = folder.getChildren();
  int count = 0;
  while (folders.hasNext() ) {
    Folder nextFolder = folders.next();
    
    if (user != null && nextFolder.checkPermission(user, requiredPerm)) {
      HashMap folderProps = new HashMap();
      folderProps.put("id", nextFolder.getID());
      folderProps.put("label", nextFolder.getTitle());
      folderProps.put("isLeaf", Boolean.toString(!nextFolder.hasChildren()));
      folderProps.put("isRestricted", Boolean.toString(!nextFolder.getACL().checkPermission(User.getAnonymousUser(),"read")));
      childrenJSON.put(folderProps);
    }
  }
  response.resetBuffer();
  out.write(responseJSON.toString());
%>