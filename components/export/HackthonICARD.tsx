/* eslint-disable jsx-a11y/alt-text */
import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer';
import ReactPDF from '@react-pdf/renderer';

type HackthonICARDPros = {
    name: string;
    teamName: string;
    teamId: string | null;
    participantId: string;
    participantRole: string;
    userType: string;
    qrCode: string;
}

// Helper function to get dynamic font size based on text length - prioritize small font over line breaks
const getDynamicFontSize = (text: string, baseSize: number = 10, maxLength: number = 20): number => {
    if (text.length <= maxLength) {
        return baseSize;
    }

    // More aggressive reduction to keep everything on one line
    const overflowRatio = text.length / maxLength;
    const reductionFactor = Math.max(0.4, 0.9 / overflowRatio);

    return Math.max(4, Math.round(baseSize * reductionFactor)); // Minimum font size of 4 (smaller minimum)
};

export const HackthonICARD = ({
    name,
    participantId,
    participantRole,
    teamId = "TM000",
    teamName,
    userType,
    qrCode,
}: HackthonICARDPros) => (
    <Document author='ADSC Atmiya' title='Hackathon ID Card' creator='ADSC Atmiya' subject='Hackathon ID Card'>
        <Page size={[198.43, 297.64]} style={styles.page}>

            {/* Header - Two Logos */}
            <View style={styles.headerLogos}>
                {/* ADSC Logo - Left */}
                <View style={styles.logoPlaceholder}>
                    <Image
                        src="/images/adsc-logo.png"
                        style={styles.headerLogoImage}
                    />
                </View>

                {/* Carnival Logo - Right */}
                <View style={styles.logoPlaceholder}>
                    <Image
                        src="/images/AU HACKATHON BG REMOVED.png"
                        style={styles.headerLogoImage}
                    />
                </View>
            </View>

            <View style={{ paddingBottom: 6 }}>
                {/* ALL-ACCESS */}
                <View style={styles.allAccessSection}>
                    <Text style={styles.allAccessText}>{userType}</Text>
                </View>
                <View style={styles.twoColumnRow}>
                    {/* Team Name */}
                    <View style={styles.columnLeft}>
                        <Text style={styles.quantumLabel}>TEAM NAME</Text>
                        <Text style={[styles.infoValueText, { fontSize: getDynamicFontSize(teamName, 10, 20) }]}>
                            {teamName}
                        </Text>
                    </View>

                    {/* Team ID */}
                    <View style={styles.columnRight}>
                        <Text style={styles.quantumLabel}>TEAM ID</Text>
                        <Text style={[styles.infoValueText, { fontSize: getDynamicFontSize(teamName, 10, 20) }]}>{teamId}</Text>
                    </View>
                </View>
            </View>

            <View style={styles.divider} />
            <View style={{ paddingTop: 10, rowGap: 8 }}>
                {/* Student Name */}
                <View>
                    <Text style={styles.quantumLabel}>STUDENT NAME</Text>
                    <Text style={[styles.nameText, { fontSize: getDynamicFontSize(name, 10, 20) }]}>
                        {name}
                    </Text>
                </View>

                {/* Participant ID */}
                <View style={[styles.twoColumnRow, { alignItems: 'flex-start' }]}>
                    <View>
                        <View>
                            <Text style={styles.quantumLabel}>ROLE</Text>
                            <Text style={styles.infoValueText}>{participantRole}</Text>
                        </View>
                        {/* QR Code and Reference ID */}
                        <View style={styles.qrSection}>
                            <View style={styles.qrCode}>
                                <View style={styles.qrPattern} />
                                <Image
                                    src={qrCode}
                                    style={styles.qrImage}
                                />
                            </View>
                        </View>
                    </View>
                    <View style={styles.userTypeContainer}>
                        {userType === 'Participant' && (
                            <View style={styles.symbolContainer}>
                                <View style={styles.circleSymbol} />
                            </View>
                        )}
                        {userType === 'Volunteer' && (
                            <View style={styles.symbolContainer}>
                                <View style={styles.triangleSymbol} />
                            </View>
                        )}
                        {userType === 'Core Team' && (
                            <View style={styles.symbolContainer}>
                                <View style={styles.squareSymbol} />
                            </View>
                        )}
                    </View>
                </View>
            </View>

            {/* Bottom - 4 Organization Logos */}
            <View style={styles.bottomLogos}>
                <View style={styles.orgLogoBox}>
                    <Image
                        src="/images/atmiya-rit-logo.png"
                        style={styles.orgLogoImage}
                    />
                </View>
                {/* <View style={styles.orgLogoBox}>
                    <Image
                        src="/images/iic-logo.png"
                        style={styles.orgLogoImage}
                    />
                </View>
                <View style={styles.orgLogoBox}>
                    <Image
                        src="/images/ssip-logo.png"
                        style={styles.orgLogoImage}
                    />
                </View> */}
                <View style={styles.orgLogoBox}>
                    <Image
                        src="/images/rita.png"
                        style={styles.orgLogoImage}
                    />
                </View>
            </View>
        </Page>
    </Document >
);

Font.register({
    family: 'Inter',
    fonts: [
        {
            src: '/fonts/Inter/Inter_Regular.ttf',
            fontWeight: 400
        },
        {
            src: '/fonts/Inter/Inter_Medium.ttf',
            fontWeight: 500
        },
        {
            src: '/fonts/Inter/Inter_SemiBold.ttf',
            fontWeight: 600
        },
        {
            src: '/fonts/Inter/Inter_Italic.ttf',
            fontStyle: 'italic',
            fontWeight: 400
        },
    ]
});

Font.register({
    family: 'Squids',
    src: '/fonts/game-of-squids/Game-Of-Squids.ttf'
});

const styles = StyleSheet.create({
    page: {
        width: '7cm',
        height: '10.5cm',
        backgroundColor: '#f9f9f9',
        padding: 0,
        position: 'relative',
        paddingLeft: 20,
        paddingRight: 20,
        fontFamily: 'Inter',
    },

    // Header Logos (Top)
    headerLogos: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 10,
        marginBottom: 5,
    },
    logoPlaceholder: {
        width: 'auto',
        height: 30,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    headerLogoImage: {
        width: 'auto',
        height: 30,
        objectFit: 'contain',
    },
    placeholderText: {
        color: '#1d4ed7',
        fontSize: 8,
        fontWeight: 'bold',
        position: 'absolute',
    },

    // ALL-ACCESS Section
    allAccessSection: {
        marginTop: 6,
        marginBottom: 4,
    },
    allAccessText: {
        color: '#000000',
        fontSize: 18,
        fontWeight: 'bold',
        letterSpacing: 2,
        fontFamily: 'Squids',
    },
    divider: {
        height: 1,
        backgroundColor: '#1d4ed7',
        marginTop: 4,
    },

    // Labels and Values
    quantumLabel: {
        color: '#6b7280',
        fontSize: 5,
        marginBottom: 2,
    },
    nameText: {
        color: '#000000',
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: 1,
        fontFamily: 'Squids',
        overflow: 'hidden',
        lineHeight: 1.2,
        textAlign: 'left',
    }, infoValueText: {
        color: '#000000',
        fontSize: 10,
        overflow: 'hidden',
        lineHeight: 1.2,
        textAlign: 'left',
    },

    // Two Column Layout
    twoColumnRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginTop: 2,
    },
    columnLeft: {
        flex: 1,
        paddingRight: 5,
    },
    columnRight: {
        flex: 0.4,
        paddingLeft: 5,
    },    // User Type Symbols
    userTypeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: -60,
    },
    symbolContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    circleSymbol: {
        width: 100,
        height: 100,
        borderRadius: 50,
        opacity: 0.4,
        backgroundColor: '#ffa805',
        borderWidth: 14,
        borderColor: '#fecd07',
    },
    triangleSymbol: {
        width: 0,
        height: 0,
        backgroundColor: 'transparent',
        borderStyle: 'solid',
        borderLeftWidth: 4,
        borderRightWidth: 4,
        borderBottomWidth: 7,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderBottomColor: '#ffff00',
    },
    squareSymbol: {
        width: 8,
        height: 8,
        backgroundColor: '#ff0000',
    },
    symbolText: {
        color: '#000000',
        fontSize: 8,
        fontWeight: '600',
    },

    // QR Code Section
    qrSection: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
    },
    qrCode: {
        width: 70,
        height: 70,
        backgroundColor: '#ffffff',
        position: 'relative',
    },
    qrPattern: {
        width: '100%',
        height: '100%',
        backgroundColor: '#000000',
    },
    qrImage: {
        width: '100%',
        height: '100%',
        position: 'absolute',
        top: 0,
        left: 0,
    },
    referenceSection: {
        flex: 1,
    },

    // Bottom Organization Logos
    bottomLogos: {
        position: 'absolute',
        flex: 1,
        left: 20,
        right: 20,
        columnGap: 5,
        bottom: 10,
        flexDirection: 'row',
        justifyContent: 'flex-start',
        alignItems: 'center',
    },
    orgLogoBox: {
        width: 'auto',
        height: 14,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ededed',
        position: 'relative',
    },
    orgLogoImage: {
        width: 'auto',
        height: 20,
        objectFit: 'contain',
    },
});
