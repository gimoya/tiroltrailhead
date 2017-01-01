from PyQt4.QtCore import *
from PyQt4.QtGui import *

def formOpen(dialog,layerid,featureid):	
	global nameField
	nameField = dialog.findChild(QLineEdit,"name")
	global regionField
	regionField = dialog.findChild(QComboBox,"region")
	global altField
	altField = dialog.findChild(QLineEdit,"altitude")
	global difficField
	difficField = dialog.findChild(QLineEdit,"difficulty")
	global riskField
	riskField = dialog.findChild(QLineEdit,"risk")
	global uphillField
	uphillField = dialog.findChild(QLineEdit,"uphill")
	global valueField
	valueField = dialog.findChild(QLineEdit,"value")
	global shuttleField
	shuttleField = dialog.findChild(QLineEdit,"shuttle")
	global conflField
	conflField = dialog.findChild(QLineEdit,"conflict")	
	global descrField
	descrField = dialog.findChild(QPlainTextEdit,"description")
	nameField.textChanged.connect( newDescr )
	regionField.currentIndexChanged.connect( newDescr )
	altField.textChanged.connect( newDescr )
	difficField.textChanged.connect( newDescr )
	riskField.textChanged.connect( newDescr )
	uphillField.textChanged.connect( newDescr )
	valueField.textChanged.connect( newDescr )
	shuttleField.textChanged.connect( newDescr )
	conflField.textChanged.connect( newDescr )

def newDescr():
	descrField.setPlainText('<div id="topic" style="float:left;">Name:</br>Region:</br>H&ouml;hendifferenz:</br>Schwierigkeit:</br>Gefahr:</br>Uphill:</br>Erlebnis:</br>Aufstiegshilfe:</br>Konflikt:</div><div id="topic-text">' +	
	nameField.text() + '</br>' + regionField.currentText() + '</br>' + altField.text() + '</br>' +
	difficField.text() + '</br>' + riskField.text() + '</br>' + uphillField.text() + '</br>' + valueField.text() + '</br>' +
	shuttleField.text() + '</br>' + conflField.text() + '</div>')