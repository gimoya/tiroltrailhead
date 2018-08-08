library(XML)

filefolder <- "gehtso"
setwd(paste0("D:/WEB/elbaweb/KMLs/", filefolder))

# delete merged KML if it exists..
unlink(grep(filefolder, dir(pattern="*.kml$"), value=T))
files <- dir(pattern="*.kml$")

# new kml file... needs to be well-formed
# new cols: good-------bad -------gehtso-----idee
#           5000FF14   501400FA   5014B4FF   50FF7800 

z <-
  '<?xml version="1.0" encoding="UTF-8"?>
   <kml xmlns="http://www.opengis.net/kml/2.2">
      <Document>
           <Folder>
             <Style id="track001">
		   <LineStyle>
			<color>5014B4FF</color>
			<width>5.0</width>
		   </LineStyle>
	       </Style>
             <name>Tracks</name>
           </Folder>
      </Document>
    </kml>'

new_xmlDoc <- xmlInternalTreeParse(z, useInternalNodes = TRUE)
 
# important add all namespace definitions...
ns <- c(gx="http://www.google.com/kml/ext/2.2",
        kml="http://www.opengis.net/kml/2.2",
        atom="http://www.w3.org/2005/Atom")
ensureNamespace(new_xmlDoc, ns)
 
# get the root off the new file for latter processing
new_root <- xmlRoot(new_xmlDoc)

# loop over files from folder
# and insert Placemark content of each file as children nodes into 
# the new file
 
for (f in files) { 
   print(f)
   # get placemark node of each file
   doc <- xmlInternalTreeParse(f, useInternalNodes = TRUE)

    if (xmlNamespaceDefinitions(doc)[[1]]$uri == "http://www.opengis.net/kml/2.2") {
        namespaces <- c(kml = "http://www.opengis.net/kml/2.2")
    } else {
        if (xmlNamespaceDefinitions(doc)[[1]]$uri == "http://earth.google.com/kml/2.0") { 
                namespaces <- c(kml0 = "http://earth.google.com/kml/2.0")
            } else {
                stop ("Stopped!: Check namespace issue..")
            }
    }

   root <- xmlRoot(doc)

   # first (only) placemark with linestring of doc, not containing "Zwischenziel"
   plcm <- getNodeSet(doc, '//kml:Placemark[not(contains(kml:name,"Zwischenziel"))]', namespaces)[[1]]
   # plcm[["description"]] <- xmlInternalTreeParse(paste0("<description><![CDATA[", sub("[.]kml", "", f), "]]></description>"), useInternalNodes = TRUE)

   # add original style to plcm
   # add placemark node to new doc
   addChildren(new_root[["Document"]][["Folder"]], plcm)

}

# save it...
saveXML(new_xmlDoc, paste0(filefolder, ".kml"))