<%--
 $Source: /home/cvs/cvsroot/cms/integration/web/components/x-dialog/chooser/search/host-retrieve.jsp,v $
 $Author: marick $
 $Revision: 1.1 $
 $Date: 2010/04/14 01:28:27 $
--%>

<%@ page contentType="text/javascript; charset=UTF-8"
         import="com.frontleaf.content.Folder,
                 com.frontleaf.server.FileIconManager,
                 com.frontleaf.server.Host,
                 com.frontleaf.sql.*,
                 java.util.HashMap,
                 java.util.Iterator,
                 org.json.JSONObject,
                 org.json.JSONArray"%>

<%@ taglib uri="http://www.frontleaf.com/tlds/request-tags-1.0" prefix="rc" %>

<rc:request>
  <parameter name="hostID" type="integer"/>
</rc:request>

<%!
   private static final String CATALOG = "type/ExtendedType";
%>

<%
  Integer hostID = requestData.getInteger("hostID");

  Host host = Host.find(hostID);

  Query query = StatementCatalog.getQuery(CATALOG, "idAndLabelBySubsite");
  query.setID("subsiteID", host.getRootFolder());
  TableDataSource types = query.getTableDataSource();
  
  JSONObject responseJSON = new JSONObject();
  JSONArray typesJSON = new JSONArray();
  responseJSON.put("types", typesJSON);
  while (types.next()) {
    HashMap<String, Object> result = new HashMap<String, Object>();
    result.put("typeID", types.getInteger("typeID"));
    result.put("label", types.getString("label"));
    typesJSON.put(result);
  }   
  response.resetBuffer();
  out.write(responseJSON.toString());
%>